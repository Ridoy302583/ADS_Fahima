import base64
from datetime import datetime, time
import io
import json
import os
import sys
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Any, Dict, List, Optional
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from langchain_experimental.agents import create_pandas_dataframe_agent
from langchain_groq import ChatGroq 
# Create FastAPI instance
from groq import Groq
from fastapi.staticfiles import StaticFiles
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)
if not os.path.exists("images"):
    os.makedirs("images")

# Mount the images directory AFTER CORS middleware
app.mount("/images", StaticFiles(directory="images", check_dir=False), name="images")
# Define request model
class ChatRequest(BaseModel):
    query: str
    fileContent: str
    selectedModel: str
    fileInfo: Dict[str, Any]  # Add fileInfo to the model
    
IMAGES_DIR = "images"
if not os.path.exists(IMAGES_DIR):
    os.makedirs(IMAGES_DIR)

# Mount the images directory

# Define root endpoint
@app.get("/")
async def read_root():
    return {"message": "Hello World"}
def save_file_with_timestamp(file_data, file_info):
    try:
        # Create uploads directory if it doesn't exist
        upload_dir = "uploads"
        if not os.path.exists(upload_dir):
            os.makedirs(upload_dir)
        
        # Get filename from fileInfo
        filename = file_info.get('name', 'unnamed_file')
        print(filename)
        # Get timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Get file extension
        file_name, file_extension = os.path.splitext(filename)
        
        # Create new filename with timestamp
        new_filename = f"{file_name}_{timestamp}{file_extension}"
        
        # Create complete file path
        file_path = os.path.join(upload_dir, new_filename)
        
        # Handle the file data
        try:
            # Try to split if it's a data URL
            if ',' in file_data:
                base64_data = file_data.split(',')[1]
            else:
                base64_data = file_data
                
            # Decode base64 data
            file_content = base64.b64decode(base64_data)
        except Exception as e:
            print(f"Base64 decoding failed: {e}")
            # If base64 decoding fails, try using the data directly
            file_content = file_data.encode() if isinstance(file_data, str) else file_data
        
        # Write to file
        with open(file_path, 'wb') as f:
            f.write(file_content)
            
        print(f"File saved successfully at: {file_path}")
        return file_path
        
    except Exception as e:
        print(f"Error saving file: {str(e)}")
        return None
def get_image_links() -> List[str]:
    """Get all image links from the images directory"""
    base_url = "http://localhost:8000/images"
    image_links = []
    
    # Get all files from images directory
    for file in os.listdir(IMAGES_DIR):
        if file.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.bmp')):
            image_links.append(f"{base_url}/{file}")
    
    return image_links
def clean_code_block(code_block):
    """
    Remove markdown code block syntax from a string.
    Args:
        code_block (str): String containing the code block with markdown syntax
    Returns:
        str: Cleaned code without markdown syntax
    """
    # Split the code into lines
    lines = code_block.strip().split('\n')
    
    # Remove ```python or ``` from start
    if lines[0].startswith('```'):
        lines = lines[1:]
    
    # Remove ``` from end
    if lines[-1].strip() == '```':
        lines = lines[:-1]
    
    # Join lines back together
    fresh_result = '\n'.join(lines).strip()
    return fresh_result
async def send_response(response):
    return response
@app.post("/api/analyze")
async def generate_response(request: ChatRequest):
    saved_path = None
    try:
        # Clean up existing files in uploads and images folders at the start
        uploads_dir = "uploads"
        images_dir = "images"

        # Clean uploads folder
        if os.path.exists(uploads_dir):
            for file in os.listdir(uploads_dir):
                file_path = os.path.join(uploads_dir, file)
                try:
                    if os.path.isfile(file_path):
                        os.remove(file_path)
                        print(f"Deleted existing upload file: {file_path}")
                except Exception as e:
                    print(f"Error deleting upload file {file_path}: {e}")

        # Clean images folder
        if os.path.exists(images_dir):
            for file in os.listdir(images_dir):
                file_path = os.path.join(images_dir, file)
                try:
                    if os.path.isfile(file_path):
                        os.remove(file_path)
                        print(f"Deleted existing image file: {file_path}")
                except Exception as e:
                    print(f"Error deleting image file {file_path}: {e}")

        query = request.query
        model_name = request.selectedModel
        file_content = request.fileContent
        file_info = request.fileInfo
        print("Query:", query)
        print("Model:", model_name)
        print("File Content:", file_content[:100] + "...")
        print(file_info)
        
        if request.fileContent:
            saved_path = save_file_with_timestamp(request.fileContent, file_info)
            print("Saved path:", saved_path)
            if not saved_path:
                raise HTTPException(status_code=400, detail="Failed to save file")

        df = None
        if saved_path:
            file_extension = os.path.splitext(saved_path)[1].lower()
            if file_extension == '.csv':
                df = pd.read_csv(saved_path)
            elif file_extension in ['.xlsx', '.xls']:
                df = pd.read_excel(saved_path)

            num_rows, num_columns = df.shape
            column_names = df.columns.tolist()
            df_final = df.head(10)
            
            today_date = datetime.now().strftime("%d-%m-%Y")
        else:
            raise HTTPException(status_code=400, detail="No file provided")

        async def process_with_groq(current_query):
            system_prompt = f"""
            You are an Expert Python developer who is experience in data analysis . Your role is to write python code using Dataframe and users questions. You just write python code, not included any text in your reponse.
            Today is {today_date}.You are provided with a pandas dataframe location is df={saved_path} with {num_rows} rows and {num_columns} columns.This is the columns name: {column_names}. This is the first 10 data from dataset: {df_final}.
            When asked about the data, your response should include a python code that describes the dataframe `df` and provide response for users question about data. Do not include any comment in your code.
            Using the provided dataframe, df, return the python code. Output possible type is (possible values "string", "number", "dataframe", "plot"). You should to return output like this conversasional way in your code, You must provide conversational response while you provide output in your code. in your code start add prefix "# Start" and when end add "# End", Do not include asterisk (```python,```) within your code,Must not use asterisk ((```python,```)) in your code. All text you write must within code. Without code do not write any text in your response. When you provide Table in your response you must provide table format in your code. When need to provide images like graphs ,charts etc you must provide it in images folder , not open directly.
            load the dataset like this format.
            df = pd.read_csv(r'{saved_path}')
            You Provide exact answer in your response. Like when asked 'how many data in here' , You just simply write that part code, Not include like this 'I have loaded dataset' etc etc. You Just provide exact answer. Not include any others without the users query.
            When need to response provide dataframe that must include .to_html() in your code. You must include dataframe format in your code instead of list and use .to_html() in your code. You provide your response for after execution it will be markdown rendered so that output will be beautify. After every line you used newline statement blackslash n and use (.).
            When need to create a ML Model that model must save within models folder with the model name with query related name.
            ULTRA IMPORTANT: After every line of print statement you must used newline statement blackslash n and use (.). Must use '\n' in your code every line of print statement.
            ULTRA IMPORTANT: You must Provide exact answer in your response. Like when asked 'how many data in here' , You just simply write that part code, Not include like this 'I have loaded dataset' etc etc. You Just provide exact answer. Not include any others without the users query.
            """
            
            client = Groq(api_key="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")
            
            completion = client.chat.completions.create(
                model=model_name,
                messages=[
                    {
                        "role": "system",
                        "content": system_prompt,
                    },
                    {
                        "role": "user",
                        "content": current_query,
                    }
                ],
                temperature=0,
                max_tokens=1024,
                top_p=1,
                stream=True,
                stop=None,
            )
            
            result = ""
            for chunk in completion:
                content = chunk.choices[0].delta.content or ""
                print(content, end="")
                result += content
                
            return result

        # Initial attempt with original query
        result = await process_with_groq(query)
        fresh_result = clean_code_block(result)
        
        max_retries = 10
        retry_count = 0
        execution_successful = False
        
        while retry_count < max_retries:
            try:
                output_capture = io.StringIO()
                sys.stdout = output_capture
                exec(fresh_result)
                output = output_capture.getvalue()
                execution_successful = True
                break  # If successful, exit the loop
                
            except Exception as e:
                error_message = str(e)
                retry_count += 1
                
                if retry_count < max_retries:
                    # Create a new query incorporating the error message
                    error_query = f"Fix this Python code error: {error_message}.Here is the Previous generated code{fresh_result}. User Original Query is: {query}. Please fix the error and try again."
                    result = await process_with_groq(error_query)
                    fresh_result = clean_code_block(result)
                else:
                    output = f"Final error after {max_retries} attempts: {error_message}"
                    
            finally:
                sys.stdout = sys.__stdout__

        # Handle generated images
        generated_images = []
        if os.path.exists(images_dir):
            image_files = [f for f in os.listdir(images_dir) 
                            if f.lower().endswith(('.png'))]
            image_files.sort(key=lambda x: os.path.getctime(os.path.join(images_dir, x)), 
                            reverse=True)
            
            for image_file in image_files[:5]:
                image_path = os.path.join(images_dir, image_file)
                generated_images.append({
                    "name": image_file,
                    "url": f"http://localhost:8000/images/{image_file}"
                })

        response = {
            "response": output,
            "images": generated_images,
            "result": result,
            "retry_count": retry_count,
            "success": execution_successful
        }
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
# Optional: Add info about how to run the application
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)