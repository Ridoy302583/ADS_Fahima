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
import os
load_dotenv()

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


@app.websocket("/ws/generate/")
async def websocket_generate(websocket: WebSocket, model: str = "llama3-8b-8192"):
    """
    WebSocket endpoint to stream responses from the model, defaulting to 'llama3-8b-8192'.
    """
    await websocket.accept()

    try:
        data = await websocket.receive_text()
        try:
            data = json.loads(data)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid JSON format")

        messages = data.get("messages", [])
        temperature = data.get("temperature", 1)
        max_tokens = data.get("max_tokens", 1024)
        top_p = data.get("top_p", 1)
        file_content = data.get("file", None) 

        if not messages:
            raise HTTPException(status_code=400, detail="Messages are required")
        
        # if file_content:
        #     import base64
        #     from io import StringIO
            
        #     try:
        #         decoded_file = base64.b64decode(file_content).decode("utf-8")
        #         file_lines = StringIO(decoded_file).readlines()
        #         messages.append({"role": "user", "content": "File content processed: " + str(file_lines[:5])})
        #     except Exception as file_error:
        #         raise HTTPException(status_code=400, detail=f"Error processing file: {str(file_error)}")

        completion = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            top_p=top_p,
            stream=True,
            stop=None,
        )
        full_response = ""
        for chunk in completion:
            content = chunk.choices[0].delta.content or ""
            full_response += content
            await websocket.send_text(content)
        print(full_response)
    except WebSocketDisconnect:
        print("Client disconnected")

    except Exception as e:
        await websocket.send_text(f"Error: {str(e)}")

    finally:
        await websocket.close()



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
