# How to Connect Devices on Different Networks (WAN)

To connect a PC and a Mobile device that are on different networks (e.g., Wi-Fi vs. 4G), you need to deploy the application to a public server and configure a TURN server.

## 1. Get a Free TURN Server
WebRTC requires a TURN server to bypass firewalls (NAT) on mobile networks.
1. Go to [Metered.ca](https://www.metered.ca/) (or any other TURN provider) and sign up for a free plan.
2. Get your **TURN URL**, **Username**, and **Credential**.

## 2. Deploy the Backend (Signaling Server)
You can deploy the `server/` folder to a service like **Render**, **Railway**, or **Heroku**.
1. Create a new Web Service.
2. Set the Build Command: `yarn install`
3. Set the Start Command: `node server/index.js`
4. **Add Environment Variables**:
   - `TURN_URL`: `turn:global.turn.metered.ca:80` (Example)
   - `TURN_USERNAME`: `your_username`
   - `TURN_CREDENTIAL`: `your_password`

## 3. Deploy the Frontend (Client)
You can deploy the React app to **Vercel** or **Netlify**.
1. Connect your repository.
2. Set the Build Command: `yarn build`
3. Set the Output Directory: `dist`
4. **Important**: You need to tell the frontend where the backend is.
   - In `src/utils/socket.ts`, change the connection URL from `'/'` to your deployed backend URL (e.g., `'https://my-backend.onrender.com'`).

## Quick Test (Without Deployment)
If you just want to test it quickly:
1. Use **ngrok** to expose your local port 3001.
   ```bash
   ngrok http 3001
   ```
2. Update `src/utils/socket.ts` to use the https URL provided by ngrok.
3. Share that URL with your mobile device.
