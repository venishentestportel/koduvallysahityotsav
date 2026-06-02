# WhatsApp Web Integration

This folder contains the backend integration for WhatsApp Web.

## Prerequisites

- Node.js (v14 or higher)
- Chrome or Chromium installed (for Puppeteer/whatsapp-web.js to work)

## Setup on Linux / Kali Linux

1. Navigate to the `backend` directory.
   ```bash
   cd backend
   ```

2. Install dependencies.
   ```bash
   npm install
   ```

3. Some Linux servers require additional dependencies for Puppeteer to launch Chromium correctly. Run the following command if you face missing shared library errors:
   ```bash
   sudo apt-get update
   sudo apt-get install -y libgbm-dev libnss3 libatk-bridge2.0-0 libxcomposite1 libxdamage1 libxrandr2 libxkbcommon-x11-0 libasound2
   ```

4. Install PM2 globally to manage the Node.js process:
   ```bash
   sudo npm install pm2 -g
   ```

## Starting the Backend

To start the backend server using PM2 (this will keep it running in the background and auto-restart it if it crashes):

```bash
cd backend
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Environment Variables

You can change the backend port by creating a `.env` file in the `backend` directory.

Example `.env`:
```
PORT=3001
```

## Security Note

The WhatsApp session data is stored in `backend/whatsapp-session`. **Do not commit this folder to public repositories** or expose it publicly. Keep it secure as it grants access to your WhatsApp account.
