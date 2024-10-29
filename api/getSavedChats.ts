/* eslint-disable @typescript-eslint/no-explicit-any */
import allowCors from "../apiHelpers/allowCors.js";
import { getMongoClient } from "../apiHelpers/getMongoClient.js";
import { AddSavedChatResponse, GetSavedChatsResponse, isAddSavedChatRequest, isDeleteSavedChatRequest, isGetSavedChatsRequest, isNeurosiftSavedChat, NeurosiftSavedChat } from "../apiHelpers/types.js";

const DATABASE_NAME = 'neurosift-saved-chats';
const COLLECTION_NAME = 'saved-chats';

export default allowCors(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const rr = req.body;
  if (!isGetSavedChatsRequest(rr)) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const {
    chatId,
    userId,
    dandiSetId
  } = rr;

  try {
    const client = await getMongoClient();

    const collection = client.db(DATABASE_NAME).collection(COLLECTION_NAME);

    const query: { [key: string]: any } = {}
    if (chatId) {
      query['chatId'] = chatId;
    }
    if (userId) {
      query['userId'] = userId;
    }
    if (dandiSetId) {
      query['dandiSetId'] = dandiSetId;
    }

    const a = await collection.find(query).toArray();
    const savedChats: NeurosiftSavedChat[] = []
    for (const x of a) {
      removeMongoIdField(x)
      if (!isNeurosiftSavedChat(x)) {
        console.warn(x);
        throw Error("Invalid saved chat found in database");
      }
      savedChats.push(x);
    }

    const resp: GetSavedChatsResponse = {
      type: 'GetSavedChats',
      savedChats: savedChats as any as NeurosiftSavedChat[]
    };

    res.status(200).json(resp);
  }
  catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

export const addSavedChatHandler = allowCors(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const rr = req.body;
  if (!isAddSavedChatRequest(rr)) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const gitHubAccessToken = req.headers.authorization?.split(" ")[1]; // Extract the token
  if (!gitHubAccessToken) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  let userId: string
  try {
      userId = await getUserIdForGitHubAccessToken(gitHubAccessToken);
  }
  catch (e) {
      res.status(401).json({ error: "Unauthorized" });
      return;
  }

  if (userId !== rr.userId) {
      res.status(401).json({ error: "Unauthorized (wrong user)" });
      return;
  }

  const {
    chatTitle,
    userId: _userId,
    dandisetId,
    messages
  } = rr;

  if (_userId !== userId) {
    res.status(401).json({ error: "Mismatched user id" });
    return;
  }

  try {
    const client = await getMongoClient();

    const collection = client.db(DATABASE_NAME).collection(COLLECTION_NAME);

    const chatId = 'nc-' + generateRandomString(14);

    const savedChatDoc: NeurosiftSavedChat = {
      chatId,
      chatTitle,
      dandisetId,
      userId,
      messages,
      timestampCreated: Date.now()
    }
    removeUndefinedFields(savedChatDoc);

    await collection.insertOne(savedChatDoc);

    const resp: AddSavedChatResponse = {
      type: 'AddSavedChat',
      chatId
    };

    res.status(200).json(resp);
  }
  catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

export const deleteSavedChatHandler = allowCors(async (req, resp) => {
  if (req.method !== "POST") {
    resp.status(405).json({ error: "Method not allowed" });
    return;
  }

  const rr = req.body;
  if (!isDeleteSavedChatRequest(rr)) {
    resp.status(400).json({ error: "Invalid request" });
    return;
  }

  const gitHubAccessToken = req.headers.authorization?.split(" ")[1]; // Extract the token
  if (!gitHubAccessToken) {
    resp.status(401).json({ error: "Unauthorized" });
    return;
  }

  let userId: string
  try {
      userId = await getUserIdForGitHubAccessToken(gitHubAccessToken);
  }
  catch (e) {
      resp.status(401).json({ error: "Unauthorized" });
      return;
  }

  const chatId = rr.chatId;

  try {
    const client = await getMongoClient();

    const collection = client.db(DATABASE_NAME).collection(COLLECTION_NAME);

    const query = {
      chatId,
      userId
    };

    const result = await collection.deleteOne(query);

    if (result.deletedCount === 0) {
      resp.status(404).json({ error: "Saved chat not found" });
      return;
    }

    resp.status(200).json({});
  }
  catch (e) {
    console.error(e);
    resp.status(500).json({ error: e.message });
  }
});

const gitHubUserIdCache: { [accessToken: string]: string } = {};
const getUserIdForGitHubAccessToken = async (gitHubAccessToken: string) => {
    if (gitHubUserIdCache[gitHubAccessToken]) {
        return gitHubUserIdCache[gitHubAccessToken];
    }

    const response = await fetch('https://api.github.com/user', {
        headers: {
            Authorization: `token ${gitHubAccessToken}`
        }
    });

    if (!response.ok) {
        throw new Error('Failed to get user id');
    }

    const data = await response.json();
    const userId = 'github|' + data.login;
    gitHubUserIdCache[gitHubAccessToken] = userId;
    return userId;
}

const removeMongoIdField = (x: any) => {
  delete x['_id'];
}

const removeUndefinedFields = (x: any) => {
  for (const key in x) {
    if ((x[key] === undefined) || (x[key] === null) || (x[key] === '')) {
      delete x[key];
    }
  }
}

const generateRandomString = (length: number) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}