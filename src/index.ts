import { Boom } from "@hapi/boom";
import {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
} from "@whiskeysockets/baileys";
// @ts-ignore
import qrcode from "qrcode-terminal";

async function connectToWhatsApp() {
  // @ts-ignore
  const { state, saveCreds } = await useMultiFileAuthState("auth_info");
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
  });

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      qrcode.generate(qr, { small: true });
    }

    if (connection === "close") {
      const shouldReconnect =
        (lastDisconnect?.error as Boom)?.output?.statusCode !==
        DisconnectReason.loggedOut;
      console.log("Conexão encerrada. Reconectar?", shouldReconnect);
      if (shouldReconnect) connectToWhatsApp();
    }

    if (connection === "open") {
      console.log("✅ Conectado com sucesso!");
    }
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    console.log("Mensagem recebida:", msg);
    if (!msg.message) return;

    const sender = msg.key.remoteJid!;
    const content =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      msg.message?.imageMessage?.caption;

    if (content === "Olá") {
      await sock.sendMessage(sender, { text: "Olá! 👋" });
    } else if (content === "/ajuda") {
      await sock.sendMessage(sender, {
        text: "📋 Comandos disponíveis:\n/ajuda\n/gerar\n/responder",
      });
    }
  });
  sock.ev.on("creds.update", saveCreds);
}

connectToWhatsApp();
