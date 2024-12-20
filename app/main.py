from typing import List, Optional
from fastapi import FastAPI, File, Form, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from fastapi import Request
from groq import Groq
import json
import asyncio
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import matplotlib.pyplot as plt
import os
load_dotenv()
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

api_key = os.getenv("API_KEY")
if not api_key:
    raise ValueError("API Key is required but not found.")
client = Groq(api_key=api_key)
# FastAPI app setup
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Message(BaseModel):
    role: str = "user"
    content: str

class GenerateRequest(BaseModel):
    messages: List[Message]
    temperature: Optional[float] = 1
    max_tokens: Optional[int] = 1024
    top_p: Optional[float] = 1

@app.post("/generate/")
async def generate(data: GenerateRequest, model: str = "llama3-8b-8192"):
    """
    Stream response from the model, defaulting to 'llama3-8b-8192'.
    Uses Pydantic models for input data.
    """
    messages = data.messages
    temperature = data.temperature
    max_tokens = data.max_tokens
    top_p = data.top_p

    if not messages:
        raise HTTPException(status_code=400, detail="Messages are required")

    completion = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
        top_p=top_p,
        stream=True,
        stop=None,
    )
    
    async def content_generator():
        for chunk in completion:
            content = chunk.choices[0].delta.content or ""
            yield content

    return StreamingResponse(content_generator(), media_type="text/plain")


class GenerateRequest(BaseModel):
    model: str
    query: str
    file: Optional[str] = None
    fileName: Optional[str] = None

# Connection manager to handle multiple WebSocket connections
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info("New WebSocket connection established")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        logger.info("WebSocket connection closed")

    async def send_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

manager = ConnectionManager()
import os
import base64
from datetime import datetime

def save_file_with_timestamp(file_data, filename):
    try:
        # Create uploads directory if it doesn't exist
        upload_dir = "uploads"
        if not os.path.exists(upload_dir):
            os.makedirs(upload_dir)
            
        # Get timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Get file extension
        file_name, file_extension = os.path.splitext(filename)
        
        # Create new filename with timestamp
        new_filename = f"{file_name}_{timestamp}{file_extension}"
        
        # Create complete file path
        file_path = os.path.join(upload_dir, new_filename)
        
        # Extract the base64 data (remove data:application/... prefix)
        base64_data = file_data.split(',')[1]
        
        # Decode base64 data
        file_content = base64.b64decode(base64_data)
        
        # Write to file
        with open(file_path, 'wb') as f:
            f.write(file_content)
            
        print(f"File saved successfully at: {file_path}")
        return file_path
        
    except Exception as e:
        print(f"Error saving file: {str(e)}")
        return None
import pandas as pd
from groq import Groq
from datetime import datetime
import io
import sys

def analyze_data(file_path, user_question,model, api_key):
    try:
        print(file_path,user_question,model,api_key)
        # Read the dataset
        file_extension = os.path.splitext(file_path)[1].lower()
        print(file_extension)
        if file_extension == '.csv':
            df= pd.read_csv(file_path)
        elif file_extension in ['.xlsx', '.xls','.xlsx']:
            df= pd.read_excel(file_path)
        # df = pd.read_csv(file_path)
        print(df)
        num_rows, num_columns = df.shape
        column_names = df.columns.tolist()
        df_final = df.head(10)
        
        # Get current date
        today_date = datetime.now().strftime("%d-%m-%Y")
        
        # Create system prompt
        system_prompt = f"""
        You are an Expert Python developer . Your role is to write python code using Dataframe and users questions. You just write python code, not included any text in your reponse.
        Today is {today_date}.You are provided with a pandas dataframe location is df={file_path} with {num_rows} rows and {num_columns} columns.This is the columns name: {column_names}. This is the first 10 data from dataset: {df_final}.
        When asked about the data, your response should include a python code that describes the dataframe `df` and provide response for users question about data. Do not include any comment in your code.
        Using the provided dataframe, df, return the python code. Output possible type is (possible values "string", "number", "dataframe", "plot"). You should to return output like this conversasional way in your code, You must provide conversational response while you provide output in your code. in your code start add prefix "# Start" and when end add "# End", Do not include (```,python,```) within your code. All text you write must within code. Without code do not write any text in your response.
        load the dataset like this format.
        df = pd.read_csv(r'{file_path}')
        Example-1:
        ```python
        # Start
        import pandas as pd 
        df = pd.read_excel(r'uploads\ALL Information Data_20241220_214931.xlsx') 
        print("Hello, I have loaded the dataset. It has", len(df.columns), "columns and", len(df), "rows.")
        print("The columns are:", df.columns.tolist()) 
        print("The first 10 rows of the dataset are:") 
        print(df.head(10))
        # End
        ```
        Example-2:
        ```python
        # Start
        import pandas as pd 
        df = pd.read_excel(r'uploads\ALL Information Data_20241220_215458.xlsx') 
        print("Hello, I have loaded the dataset. It has", len(df.columns), "columns and", len(df), "rows.")
        print("The number of unique countries in the dataset is:", len(df['Country'].unique))
        # End
        ```
        """
        
        # Initialize Groq client
        client = Groq(api_key=api_key)
        
        # Get completion
        completion = client.chat.completions.create(
            model="llama-3.1-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": system_prompt,
                },
                {
                    "role": "user",
                    "content": user_question,
                }
            ],
            temperature=0,
            max_tokens=1024,
            top_p=1,
            stream=True,
            stop=None,
        )
        
        # Initialize result string
        result = ""
        
        # Process streaming response
        for chunk in completion:
            content = chunk.choices[0].delta.content or ""
            print(content, end="")
            result += content
            
        return {
            "status": "success",
            "code": result,
            "error": None
        }
            
    except Exception as e:
        return {
            "status": "error",
            "code": None,
            "error": str(e)
        }
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
@app.websocket("/ws/generate/")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    
    try:
        while True:
            # Receive and parse the message
            data = await websocket.receive_text()
            request_data = json.loads(data)
            model = request_data.get('model')
            query=request_data.get('query') # Returns None if key doesn't exist
            file=request_data.get('file') # Returns None if key doesn't exist
            filename_str = request_data.get('fileName', '') 
            file_info = json.loads(filename_str)
            filename=file_info.get('name', '')
            print(model,query,filename)
            if file and filename:
                saved_path = save_file_with_timestamp(file, filename)
                if saved_path:
                    print(f"File stored at: {saved_path}")
                else:
                    print("Failed to save file")
            # logger.info(f"Received request: {request_data}")
            # print(saved_path)
            # Validate the request data
            file_extension = os.path.splitext(saved_path)[1].lower()
            print(file_extension)
            if file_extension == '.csv':
                df= pd.read_csv(saved_path)
            elif file_extension in ['.xlsx', '.xls','.xlsx']:
                df= pd.read_excel(saved_path)
            # df = pd.read_csv(file_path)
            print(df)
            num_rows, num_columns = df.shape
            column_names = df.columns.tolist()
            df_final = df.head(10)
            
            # Get current date
            today_date = datetime.now().strftime("%d-%m-%Y")
            
            # Create system prompt
            system_prompt = f"""
            You are an Expert Python developer . Your role is to write python code using Dataframe and users questions. You just write python code, not included any text in your reponse.
            Today is {today_date}.You are provided with a pandas dataframe location is df={saved_path} with {num_rows} rows and {num_columns} columns.This is the columns name: {column_names}. This is the first 10 data from dataset: {df_final}.
            When asked about the data, your response should include a python code that describes the dataframe `df` and provide response for users question about data. Do not include any comment in your code.
            Using the provided dataframe, df, return the python code. Output possible type is (possible values "string", "number", "dataframe", "plot"). You should to return output like this conversasional way in your code, You must provide conversational response while you provide output in your code. in your code start add prefix "# Start" and when end add "# End", Must use start of the code backstrick ```python and end of the code ``` . All text you write must within code. Without code do not write any text in your response.
            load the dataset like this format.
            df = pd.read_csv(r'{saved_path}')
            When asked about image,chart,graph image related that will be stored in a seperate folder name "images" in the same directory as the code but the name of the images will be unique name ,do not open directly the images.
            Exampple-1:
                ```python
                import pandas as pd 
                df = pd.read_excel(r'uploads\ALL Information Data_20241220_211355.xlsx') 
                print("Hello, I have loaded the dataset. It has", len(df.columns), "columns and", len(df), "rows.") 
                print("The columns are:", df.columns.tolist()) 
                print("The first 10 rows of the dataset are:") 
                print(df.head(10))
                ```
                
            Example-2:
                ```python
                #Start
                import pandas as pd 
                df = pd.read_excel(r'uploads\ALL Information Data_20241220_211719.xlsx') 
                print("Hello, I have loaded the dataset. It has", len(df.columns), "columns and", len(df), "rows.")
                ```
            """
            
            # Initialize Groq client
            client = Groq(api_key=api_key)
            
            # Get completion
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
            
            # Initialize result string
            result = ""
            
            # Process streaming response
            for chunk in completion:
                content = chunk.choices[0].delta.content or ""
                print(content, end="")
                result += content
                # Send each chunk immediately to the frontend
                await websocket.send_text(content)
            fresh_result = clean_code_block(result)
            # print(fresh_result)
            # Execute the code
            output = None
            error_message = None
            try:
                # Redirect stdout to capture print output
                output_capture = io.StringIO()
                sys.stdout = output_capture

                # Execute the code
                exec(fresh_result)

                # Capture the output
                output = output_capture.getvalue()

            except Exception as e:
                # Capture the error message
                error_message = str(e)

            finally:
                # Reset stdout to its original state
                sys.stdout = sys.__stdout__

            # Send output or error message back to frontend
            if error_message:
                print(error_message)
                await websocket.send_text("Error123:"+error_message)
            else:
                await websocket.send_text("Output123:"+output)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"Error processing WebSocket message: {str(e)}")
        error_message = json.dumps({"error": "Internal server error", "details": str(e)})
        await manager.send_message(error_message, websocket)
        manager.disconnect(websocket)

@app.post("/execute_code")
async def execute_code(request: Request):
    print("Hello ")
    """
    Receive code from the frontend, execute it, and send the output back.
    """
    # Receive code from frontend
    code = await request.json()
    print(code)
    # Clean the code block
    fresh_result = clean_code_block(code["code"])
    print(fresh_result)
    # Execute the code
    output = None
    error_message = None
    try:
        # Redirect stdout to capture print output
        output_capture = io.StringIO()
        sys.stdout = output_capture

        # Execute the code
        exec(fresh_result)

        # Capture the output
        output = output_capture.getvalue()

    except Exception as e:
        # Capture the error message
        error_message = str(e)

    finally:
        # Reset stdout to its original state
        sys.stdout = sys.__stdout__

    # Send output or error message back to frontend
    if error_message:
        return {"error": error_message}
    else:
        return {"output": output}

@app.post("/transcribe/")
async def transcribe_audio(
    file: UploadFile = File(...),  
    model: str = Form("whisper-large-v3"), 
    response_format: str = Form("verbose_json"),  
):
    """
    Accepts an audio file and transcribes it using Groq's Whisper model.
    """
    try:
        # Save the uploaded file temporarily
        file_location = f"temp_audio_{file.filename}"
        with open(file_location, "wb") as f:
            f.write(await file.read())

        # Perform transcription using Groq
        with open(file_location, "rb") as audio_file:
            transcription = client.audio.transcriptions.create(
                file=(file.filename, audio_file.read()),
                model=model,
                response_format=response_format,
            )

        # Clean up the temporary audio file after transcription
        os.remove(file_location)

        # Return the transcription text in the response
        return {"transcription": transcription.text}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing transcription: {str(e)}")
