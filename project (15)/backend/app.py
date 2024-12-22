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
@app.post("/api/analyze")
async def generate_response(request: ChatRequest):
    try:
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

        system_prompt = f"""
        You are an Expert Python developer . Your role is to write python code using Dataframe and users questions. You just write python code, not included any text in your reponse.
        Today is {today_date}.You are provided with a pandas dataframe location is df={saved_path} with {num_rows} rows and {num_columns} columns.This is the columns name: {column_names}. This is the first 10 data from dataset: {df_final}.
        When asked about the data, your response should include a python code that describes the dataframe `df` and provide response for users question about data. Do not include any comment in your code.
        Using the provided dataframe, df, return the python code. Output possible type is (possible values "string", "number", "dataframe", "plot"). You should to return output like this conversasional way in your code, You must provide conversational response while you provide output in your code. in your code start add prefix "# Start" and when end add "# End", Do not include asterisk (```python,```) within your code,Must not use asterisk ((```python,```)) in your code. All text you write must within code. Without code do not write any text in your response. When you provide Table in your response you must provide table format in your code. When need to provide images like graphs ,charts etc you must provide it in images folder , not open directly.
        load the dataset like this format.
        df = pd.read_csv(r'{saved_path}')
        Example-1:
        # Start
        import pandas as pd 
        df = pd.read_excel(r'uploads\ALL Information Data_20241220_214931.xlsx') 
        print("Hello, I have loaded the dataset. It has", len(df.columns), "columns and", len(df), "rows.")
        print("The columns are:", df.columns.tolist()) 
        print("The first 10 rows of the dataset are:") 
        print(df.head(10))
        # End
        Example-2:
        # Start
        import pandas as pd 
        df = pd.read_excel(r'uploads\ALL Information Data_20241220_215458.xlsx') 
        print("Hello, I have loaded the dataset. It has", len(df.columns), "columns and", len(df), "rows.")
        print("The number of unique countries in the dataset is:", len(df['Country'].unique))
        # End
        Must Provide Response in a conversational manner. When you provide about dataframe you try to provide within table format provide table using .to_html() code.When you need to generate graph or charts images then you store that in a folder which name is 'images', Do not directly open the graph or charts etc.
        """
        
        client = Groq(api_key="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")
        
        completion = client.chat.completions.create(
            model="llama-3.1-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": system_prompt,
                },
                {
                    "role": "user",
                    "content": query,
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
        print(result)
        fresh_result = clean_code_block(result)
        print(fresh_result)
        
        # Execute the code
        output = None
        error_message = None
        generated_images = []
        try:
            output_capture = io.StringIO()
            sys.stdout = output_capture
            exec(fresh_result)
            output = output_capture.getvalue()
        
            
        except Exception as e:
            error_message = str(e)
        finally:
            sys.stdout = sys.__stdout__
        images_dir = "images"
        if os.path.exists(images_dir):
            # Get list of image files sorted by creation time (newest first)
            print( images_dir )
            image_files = [f for f in os.listdir(images_dir) 
                            if f.lower().endswith(('.png'))]
            print(image_files)
            image_files.sort(key=lambda x: os.path.getctime(os.path.join(images_dir, x)), 
                            reverse=True)
            print(image_files)
            # Get the most recent images
            for image_file in image_files[:5]:  # Limit to 5 most recent images
                image_path = os.path.join(images_dir, image_file)
                print(image_path)
                # Only include images created in the last few seconds
                
                generated_images.append({
                    "name": image_file,
                    "url": f"http://localhost:8000/images/{image_file}"
                })
        print(output)
        print(generated_images)
        response = {
            "response": output if output else error_message,
            "images": generated_images  # Include image URLs
        }
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
# Optional: Add info about how to run the application
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)