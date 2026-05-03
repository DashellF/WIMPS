## WIMPS

The Web Interactive Mips Pocket Simulator

--- 

To start out this project, first install all dependencies with the command
`npm install && npm --prefix backend install`

Then, make a new file in `/backend/.env` and fill it in with your database link and credentials like so:
```
MONGO_URI=mongodb+srv://someuser:somepassword@somelink
JWT_SECRET=someencpassword
```

Next, run the backend server in /backend with `node server.js`


To run this server on IOS and Android too, forward this endpoint in a new terminal with `ngrok http 3001`, and make a new `.env` file in the base directory with the format:
```
EXPO_PUBLIC_API_URL=https://somengroklinkyougotinthepreviousstep.ngrok-free.app
```

Then, you can run the main app with `npx expo start --tunnel -c` in a 3rd terminal located in the base directory
