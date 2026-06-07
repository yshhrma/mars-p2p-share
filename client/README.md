# Mars P2P Share

This is a peer to peer file sharing web application I built for my project. It allows two users to transfer files directly from one browser to another securely without storing anything on a server.

## Live Demo Links
* Frontend App: (https://mars-p2p-share.vercel.app/)
* Backend Server: (https://mars-p2p-share.onrender.com)
* Demo Video: (https://drive.google.com/drive/folders/1_ULn0HTq5QIU_kNoF0LGiID2wtVE86on?usp=sharing)

## Project Description
I wanted to build a file sharing app that focuses on user privacy. To do this, I used WebRTC to create a direct connection between the sender and the receiver. Because it is peer to peer, the files never sit on a database. 

## Tech Stack
* Frontend: React, Vite, Tailwind CSS
* Backend: Node.js, Express, Socket.io
* Security: Web Crypto API

## Setup Instructions
If you want to run this project on your own computer, you will need to open two terminal windows to start both the server and the client.

### 1. Start the Backend Server
Open your first terminal, navigate to the server folder, and run these commands:
* cd server
* npm install
* node index.js

The server will run on localhost port 5000.

### 2. Start the Frontend App
Open your second terminal, navigate into the client folder, and run:
* cd client
* npm install
* npm run dev

The React app will open on localhost port 5173.

## Core Features Implemented
* Drag and drop file upload to easily create a share room.
* Direct peer to peer file transfer using WebRTC data channels.
* Real time progress bar that shows the transfer percentage.
* Automatic file download on the receiver's side once the transfer is 100 percent complete.
* Also lets the other user know that the other side user has disconnected.

## Extra Features for Brownie Points
I implemented several advanced engineering features beyond the basic requirements to earn extra brownie points on this submission:

* Zero Knowledge Client Side Encryption: The app encrypts file chunks using AES-GCM 256-bit encryption directly inside the browser before transmission. The decryption key is kept in the URL hash fragment, meaning it stays purely client-side and the signaling server remains completely blind to the file data.
* Cryptographic Integrity Verification: To guarantee completely safe transfers, the app generates and verifies a SHA-256 cryptographic hash of the file chunks before and after the transfer. This ensures that the received file has zero data corruption.
* Live Cloud Deployment: Rather than just presenting a local environment, I successfully completed a full production deployment. The Node.js signaling engine is hosted on Render and the frontend React application is deployed to Vercel.
