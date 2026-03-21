# **ORIN**

**A Context Operating System powered by Notion MCP \+ Gemini**

---

# **1\. Product Definition**

## **One-line**

Orin turns Notion into a living memory and uses Gemini to read, structure, and act on that memory across workflows.

## **Core Value**

* Centralize scattered work into Notion (as structured memory)

* Let an AI operator retrieve, synthesize, and generate systems/docs

* Provide a single interface (chat) to control it all

---

# **2\. User Experience**

## **Entry Flow**

1. Landing page

2. Sign in (Google OAuth)

3. Onboarding modal:

   * Paste Gemini API key

   * Connect Notion (OAuth / MCP endpoint)

4. Redirect to Chat Dashboard

---

## **Primary Interface: Chat Dashboard**

### **Layout**

* Left sidebar:

  * Chat history

  * “New session”

* Main panel:

  * Chat stream

  * Input box (multi-line, file upload)

* Top bar:

  * Mode switch (two modes)

  * Connected sources indicator (Notion \+ integrations)

---

## **Mode Design (Important)**

Rename your modes to be intuitive and powerful:

### **1\. Explore Mode (Ask Mode)**

* Read-only intelligence

* Answers questions using context

* No writes unless explicitly asked

### **2\. Build Mode (Save Mode)**

* Active system operator

* Writes to Notion

* Creates pages, databases, structures

Behavior:

* Default \= Explore

* Build mode requires confirmation for writes

---

# **3\. Core Features**

---

## **3.1 Super Memory (Notion as Brain)**

### **Capability**

* Store any input into structured Notion pages

### **Implementation**

#### **Step 1: Input Parsing**

* Accept:

  * text

  * links

  * files (optional v1: text \+ links only)

#### **Step 2: Gemini Processing**

Prompt:

* classify content:

  * type: note / idea / code / research / task

  * title

  * tags

  * summary

#### **Step 3: Notion Write**

Use Notion API:

* Create page in database:

  * “Inbox” (default DB)

Schema:

* Title (text)

* Type (select)

* Tags (multi-select)

* Content (rich text)

* Source (url/text)

* Created At

---

## **3.2 Context Retrieval Engine**

### **Capability**

Answer queries using stored memory \+ connected sources

### **Implementation**

#### **Step 1: Fetch Context**

* Query Notion DB:

  * filter by keywords

  * recent items

#### **Step 2: Optional External Data**

* Mock:

  * emails.json

  * slack.json

#### **Step 3: Gemini Prompt**

* Provide:

  * user query

  * retrieved data

* Ask for:

  * answer

  * references (Notion URLs)

#### **Output Format**

* Summary

* Bullet points

* Reference links

---

## **3.3 Notion Document Generation**

### **Capability**

Convert chat or knowledge into structured Notion docs

### **Implementation**

#### **Step 1: Trigger**

User:

* “Create a business plan”

* “Turn this into docs”

#### **Step 2: Gemini Prompt**

Request:

* structured output:

  * headings

  * sections

  * tables (markdown-like)

#### **Step 3: Transform to Notion Blocks**

Map:

* headings → heading blocks

* paragraphs → text blocks

* lists → bulleted blocks

#### **Step 4: Create Page**

* Title: generated

* Parent: “Documents” DB

---

## **3.4 Resume Work (Context Continuity)**

### **Capability**

Restore prior work state

### **Implementation**

#### **Step 1: Store Sessions**

Each chat session:

* saved in DB:

  * title

  * summary

  * related pages

#### **Step 2: On Request**

User:

* “Continue coding”

#### **Step 3: Retrieve**

* last session

* related Notion pages

#### **Step 4: Gemini Prompt**

* summarize:

  * what was done

  * next steps

---

## **3.5 Universal Input Layer**

### **Capability**

Drop anything → structured memory

### **Implementation**

Start simple:

* text \+ URLs

For URLs:

* fetch metadata (title, description)

* pass to Gemini for classification

---

## **3.6 Connected Sources Indicator**

### **Requirement**

Show what’s connected via Notion

### **Reality Constraint**

Notion does not expose all integrations cleanly.

### **Solution (Practical)**

#### **Option A (Recommended)**

* Maintain your own “Connections” table:

  * Notion

  * Email (mock)

  * Slack (mock)

#### **Option B (Advanced)**

* If MCP provides tool registry:

  * display available tools dynamically

UI:

* Top bar:

  * “Connected: Notion, Email, Slack”

---

## **3.7 Chat History**

### **Implementation**

Database:

* Sessions DB

Fields:

* Title

* Messages (JSON)

* Created At

Flow:

* Save after each interaction

* Load on click

---

## **3.8 Authentication**

### **Google Auth**

Use:

* Firebase Auth or NextAuth

Flow:

* Google OAuth

* store user ID

* associate:

  * Gemini key

  * Notion tokens

---

## **3.9 Gemini Integration**

### **Model**

Use:

* Gemini 1.5 Pro (or latest available)

### **Responsibilities**

* classification

* summarization

* structured output

* reasoning

### **Key Pattern**

Always use:

* system prompt

* structured output format

---

# **4\. System Architecture**

---

## **Frontend**

* Next.js

* Tailwind

* Components:

  * Chat UI

  * Sidebar

  * Mode toggle

  * Connection status

---

## **Backend**

* Node.js (API routes)

Endpoints:

* /chat

* /save

* /retrieve

* /generate-doc

* /sessions

---

## **Storage**

* Minimal DB:

  * Firebase / Supabase

Stores:

* users

* sessions

* settings

---

## **Notion Layer**

* Notion API (via MCP if available)

* Functions:

  * createPage

  * queryDatabase

  * updatePage

---

## **AI Layer**

* Gemini API

* Wrapper functions:

  * classifyContent()

  * answerQuery()

  * generateDoc()

---

# **5\. Data Model (Notion)**

---

## **Inbox DB**

* Title

* Type

* Tags

* Content

* Source

* Created At

---

## **Documents DB**

* Title

* Content

* Related Items

---

## **Sessions DB**

* Title

* Summary

* Related Pages

---

# **6\. Deliverables**

---

## **1\. Working Web App**

* Auth

* Chat interface

* Notion integration

* Gemini integration

---

## **2\. Notion Workspace**

* Pre-configured databases:

  * Inbox

  * Documents

  * Sessions

---

## **3\. Demo Script (Critical)**

---

# **7\. Demo Walkthrough**

---

## **Step 1: Setup**

* Login

* Paste Gemini key

* Connect Notion

Say:  
 “This is Orin. It turns Notion into a memory system and lets AI operate on it.”

---

## **Step 2: Save Data**

Paste:

* idea

* link

Say:  
 “Store this”

Show:

* Notion page created

---

## **Step 3: Ask Context**

Ask:  
 “What did I receive today?”

Show:

* summarized output

* references

---

## **Step 4: Generate System**

Ask:  
 “Turn this into a business plan”

Show:

* structured Notion doc

---

## **Step 5: Intelligence**

Ask:  
 “Analyze everything and create a doc”

Show:

* synthesized output

---

## **Step 6: Superpower Moment**

Ask:  
 “Continue my work”

Show:

* restored context

* next steps

