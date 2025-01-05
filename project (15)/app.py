# Start
import pandas as pd
import matplotlib.pyplot as plt

df = pd.read_csv(r'D:\All_repositories\Chatbot_Updated_UI\Search_API_Platform\ADS_Fahima\project (15)\backend\uploads\titanic_20250105_112247.csv')

print("Hello, I have loaded the dataset. It has", len(df.columns), "columns and", len(df), "rows.")
print("The columns are:", df.columns.tolist())

print("The total number of data in the dataset is:", len(df))

print("The number of persons who survived is:", df['Survived'].sum())

df_sorted = df.sort_values(by='Age', ascending=False)
print("The first 50 rows of the dataset sorted by highest ages person are:")
print(df_sorted.head(50).to_html())

plt.figure(figsize=(10,6))
plt.pie(df['Survived'].value_counts(), labels=['Not Survived', 'Survived'], autopct='%1.1f%%')
plt.title('Survival Rate')
# plt.savefig('survival_rate.png')

plt.figure(figsize=(10,6))
plt.pie(df['Sex'].value_counts(), labels=['Male', 'Female'], autopct='%1.1f%%')
plt.title('Sex Distribution')
# plt.savefig('images/sex_distribution.png')

highest_value_column = df.max().idxmax()
lowest_value_column = df.min().idxmin()

plt.figure(figsize=(10,6))
plt.bar([highest_value_column, lowest_value_column], [df[highest_value_column].max(), df[lowest_value_column].min()])
plt.xlabel('Column Name')
plt.ylabel('Value')
plt.title('Highest and Lowest Value Column')
# plt.savefig('images/highest_lowest_value_column.png')

from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score

X = df[['Pclass', 'Age', 'SibSp', 'Parch', 'Fare']]
y = df['Survived']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

models = [LogisticRegression(), DecisionTreeClassifier(), RandomForestClassifier()]
model_names = ['Logistic Regression', 'Decision Tree', 'Random Forest']

for model, model_name in zip(models, model_names):
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    print(f'The accuracy of {model_name} is: {accuracy_score(y_test, y_pred)}')

# End