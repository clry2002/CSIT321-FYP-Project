Please read through this manual to run the program.


git clone https://github.com/clry2002/CSIT321-FYP-Project
cd CSIT321-FYP-Project

Install Node.js dependencies:
npm install

Set up Python virtual environment:
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On Unix/MacOS:
   source venv/bin/activate

chatbot requirements:
pip install langchain langchain-groq python-dotenv langchain-community supabase flask flask_cors textstat

install dependencies:
npm install -D @eslint/css@^0.6.0 @eslint/eslintrc@^3 @eslint/js@^9.24.0 @eslint/json@^0.11.0 @eslint/markdown@^6.3.0 @types/node@^20 @types/react@^19.1.2 @types/react-dom@^19.1.2 @typescript-eslint/eslint-plugin@^8.30.1 @typescript-eslint/parser@^8.30.1 autoprefixer@^10.4.21 eslint@^9.24.0 eslint-config-next@15.2.0 eslint-plugin-react@^7.37.5 globals@^16.0.0 postcss@^8.5.3 postcss-nesting@^13.0.1 tailwindcss@^4.1.4 typescript@^5.8.3 typescript-eslint@^8.30.1


run file locally:
npm run dev
