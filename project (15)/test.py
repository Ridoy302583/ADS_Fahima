import os 
import pandas as pd 
from langchain_experimental.agents import create_pandas_dataframe_agent
from langchain_groq import ChatGroq 

# Set up API key for Groq (uncomment if needed)
# import getpass
# if "GROQ_API_KEY" not in os.environ:
#     os.environ["GROQ_API_KEY"] = getpass.getpass("Enter your Groq API key: ")

try:
    # Importing the data using read_excel for Excel files
    df = pd.read_excel(r'D:\All_repositories\Chatbot_Updated_UI\Search_API_Platform\ADS_Fahima\app\uploads\ALL Information Data_20241221_120136.xlsx') 

    # Initializing the agent with Groq
    agent = create_pandas_dataframe_agent(
        ChatGroq(api_key="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", model="llama-3.1-70b-versatile"),
        df,
        verbose=True,
        allow_dangerous_code=True,  # Allow execution of arbitrary code
        handle_parsing_errors=True  # Allow handling parsing errors
    ) 

    # Querying the agent using invoke method due to deprecation warning
    response = agent.invoke("How many data in here?")
    print(response)

except Exception as e:
    print(f"An error occurred: {e}")
