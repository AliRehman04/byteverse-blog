**Memory in an n8n AI Agent is nothing more than a list of past messages, stored under a session ID and replayed into the prompt on every run.** Which messages are stored, how many come back, where they live and when they vanish are decided by three settings most builders never change: the memory node's **Session ID**, its **Context Window Length**, and the choice between **Simple Memory** and a database backed node such as **Postgres Chat Memory**. Get those wrong and you see the classic symptoms: an agent that forgets after an hour, "No session ID found" on the first production run, every Telegram user sharing one conversation, or a Postgres table that grows forever.

This guide explains how agent memory behaves in n8n 2.46, the current release at the time of writing, using the memory nodes' own source code and the agent's memory handling rather than guesswork: how the session ID is resolved and why node version 1.4 changed it, exactly how Simple Memory stores and expires data, what Context Window Length really counts once tools are involved, how Postgres Chat Memory creates and reads its table, how to clear or inspect memory with the Chat Memory Manager, how to give every user their own memory, and how to fix each error message. If you are new to n8n, start with the [beginner guide to n8n](/blog/how-to-use-n8n-2026-complete-guide) first.

## What memory does in an agent, and what it does not

Every execution of an n8n workflow starts empty. When a user sends a second message, the AI Agent node has no idea what the first one said unless a memory sub node hands it the earlier messages. That is the whole job of memory: before the model is called, the agent loads the stored messages for the current session and inserts them into the prompt between the system message and the new user input; after the model answers, the agent saves the new user message and the answer back into the same store.

Three boundaries follow from that design:

- **Memory is per session, not per workflow.** Two users with different session IDs never see each other's messages; two users who end up with the same session ID share one conversation.
- **Memory is short term conversation history, not knowledge.** It does not remember facts across sessions, it does not search documents, and it is not a vector store. For "remember everything about this customer" you store data in a database or a data table and load it into the prompt yourself; for documents you use a vector store and retrieval.
- **Only agents use it.** The documentation is explicit that AI agent nodes can use memory while AI chains can't; a Basic LLM Chain has no memory connector. If you need history with a chain, add the previous messages to the prompt yourself or switch to an agent.

What gets saved is more than two messages per turn. Reading the agent's memory handling in the source: for a plain answer the agent stores the user input and the final answer. When the agent used tools, it stores the user message, then one AI message carrying the tool calls and one tool message per call with the tool's result, then the final answer. That detail matters for the context window, as the next sections show. If an output parser is connected, the saved answer is the JSON of the structured output, because the agent stringifies it before storing.

![A person working in a web application on a laptop](https://www.byteverse.fyi/blog/gemini-workspace/photo-cover.jpg "Illustrative photograph of a person working in a web application on a laptop, not a screenshot of n8n. Photo: cottonbro studio / Pexels.")

## The memory nodes compared

n8n ships one built in store and several database backed ones. The documentation lists Simple Memory as the easiest start and names Motorhead, Redis Chat Memory, Postgres Chat Memory, Xata and Zep as the service backed options; MongoDB Chat Memory also exists. The three you will actually choose between most of the time:

| | Simple Memory | Postgres Chat Memory | Redis Chat Memory |
|---|---|---|---|
| Where messages live | Inside the n8n process, in a map keyed by workflow and session | A Postgres table, default name n8n_chat_histories, created automatically | Redis keys per session |
| Survives an n8n restart | No | Yes | Yes, until the TTL expires |
| Works in queue mode or multi main | No, the node itself warns that memory is not shared across workers | Yes | Yes |
| Expiry | Sessions idle for 60 minutes are dropped; everything is lost on restart | Never; rows stay until you delete them | Optional Session Time To Live in seconds, 0 means never |
| Context Window Length | Yes | Yes from node version 1.1; older nodes send the whole history | Yes from node version 1.3; older nodes send the whole history |
| Credentials needed | None | Postgres | Redis |
| Best for | Prototyping and single instance, low stakes bots | Production bots on any hosting, including n8n Cloud with an external database | Production bots that want automatic expiry |

The expiry row is the one that surprises people, and both halves come straight from the Simple Memory source. The node keeps every session in one in memory map. Each time any session is accessed, the node first walks the map and deletes every session whose last access is more than one hour old. So a user who comes back after a 61 minute coffee break starts a fresh conversation, and a restart, a Cloud update or a crash clears everything at once. None of that is a bug; it is what "stores in n8n memory, so no credentials required" means.

## Session ID: the key that decides what the agent remembers

Every memory node has a **Session ID** parameter with two options, and the source shows exactly how each is resolved:

- **Connected Chat Trigger Node** (the default). The node looks for a field called `sessionId` on the incoming item. If that is empty, it looks for a Chat Trigger node in the workflow and reads `sessionId` from its first output item. If neither exists, it throws "No session ID found" with the description "Expected to find the session ID in an input field called 'sessionId' (this is what the chat trigger node outputs). To use something else, change the 'Session ID' parameter."
- **Define below.** The node uses whatever the **Key** field evaluates to. An empty key throws "Key parameter is empty" with a description pointing back to the Chat Trigger option.

In both modes the value must be text or a number or a boolean; numbers and booleans are converted to strings, which is why a numeric Telegram chat ID works as a key. An object or an array is rejected with "Invalid session ID: The session ID must be a text value", because the key addresses rows in a store and must never be a structure.

### Which key to use for each channel

The Chat Trigger generates and sends a session ID with every message, so the default works there with no configuration. Everything else needs **Define below** and an expression that is stable for one conversation and different between conversations. Typical payload fields, which you should confirm against your trigger's actual output:

| Channel | Key expression | Scope of memory |
|---|---|---|
| Chat Trigger (hosted or embedded) | Leave Session ID on Connected Chat Trigger Node | One browser chat session |
| Telegram Trigger | `{{ $json.message.chat.id }}` | One chat; in a group, everyone shares it |
| Telegram, per person inside a group | `{{ $json.message.chat.id + '_' + $json.message.from.id }}` | One person in one group |
| WhatsApp Trigger | `{{ $json.messages[0].from }}` | One phone number |
| Slack Trigger | `{{ $json.event.user }}` or channel plus thread timestamp | One user, or one thread |
| Webhook from your own app | `{{ $json.body.sessionId }}` or your user ID field | Whatever your app decides |
| Scheduled or internal agent | A fixed string such as `nightly-report` | One shared conversation |

The expression lives in the **Key** field of the memory node and is evaluated there, so the field names refer to the output of the node feeding the agent:

```txt
{{ $json.message.chat.id }}
```

A static key such as `my_test_session` is fine while building, and the documentation says so, but it means every user of the published workflow shares one memory. If your production bot answers one user with another user's context, a static key or a key that is the same for everyone is almost always the cause.

### Node version 1.4 scopes the session to the memory node

Since Simple Memory and Postgres Chat Memory version 1.4 (Redis Chat Memory 1.6, MongoDB Chat Memory 1.1), a memory node in **Connected Chat Trigger Node** mode appends its own node name to the session ID before storing: the stored key becomes the session ID, two underscores, and the node name with anything outside letters, digits, underscore and hyphen replaced by underscores. The node shows a hint about this: the session is automatically scoped to this memory node, and to share a session between different memory nodes you switch Session ID to Define below and use the same key in each.

Three consequences are easy to miss:

1. **Two memory nodes in the default mode never share history,** even in the same workflow with the same chat session. That is by design, so an agent and a sub agent do not pollute each other.
2. **Renaming a memory node in the default mode starts a new history.** The rows under the old key are still in Postgres, but the node now reads a different key. If a bot "lost its memory" right after a tidy up of node names, this is why.
3. **Define below is not scoped.** The key you write is the key that is stored, so two memory nodes with the same Define below expression share one history, which is exactly what you want when a Chat Trigger and an agent, or a Chat Memory Manager and an agent, must see the same messages.

One more detail from the same code: scoping uses the memory node's name, not the agent's, so connecting a single memory node to several agents gives all of them the same bucket. To isolate memory per agent, duplicate the memory node.

### One execution, one session

Memory nodes are sub nodes, and the documentation warns that in sub nodes an expression always resolves to the first item. The agent code confirms the practical effect: it fetches the memory connection once, for item index 0, and uses it for every item in the run. If five Telegram messages from five chats arrive in one execution, all five turns are stored under the first chat's session ID.

The fix is to make sure the agent runs with one item per execution. Most chat triggers already do that, because each incoming message starts its own execution. When you process a batch, put a [Loop Over Items node](/blog/n8n-loop-over-items-guide) with a batch size of 1 in front of the agent, or move the agent into a [sub-workflow](/blog/n8n-sub-workflow-guide) called once per item.

## Context Window Length counts messages, not tokens

**Context Window Length** defaults to 5 and the hint says "how many past interactions the model receives as context". The implementation is LangChain's window buffer: the memory node loads the stored messages for the session and returns the last `k × 2` of them, where k is the window length. The store itself keeps everything; only what is returned to the model is cut.

Two things follow:

- **The window is measured in messages, not tokens or characters.** Five long interactions can be far bigger than fifty short ones. If you need a token budget, you have to trim the history yourself, for example with the Chat Memory Manager pattern below.
- **Tool calls eat the window.** A turn in which the agent called two tools is stored as four or more messages: the user message, the AI message with the tool calls, one tool message per call, and the final answer. With k = 5 the model receives the last 10 stored messages, which may be only two or three real turns of a tool heavy conversation. The agent cleans up any orphaned tool messages that the cut leaves at the edges, so the prompt stays valid, but the agent remembers fewer exchanges than you expect.

Raise the window when the conversation is tool heavy or when users refer back to earlier turns, and lower it when cost matters; every stored message in the window is sent to the model on every turn, so a window of 20 on a long session multiplies input tokens quickly.

Two version notes from the source. Postgres Chat Memory below version 1.1 and Redis Chat Memory below version 1.3 had no window at all; they sent the entire history every time. If a workflow imported from an old template keeps getting longer and more expensive, open the memory node, check its version, and replace it with a current one.

## Simple Memory in depth

The Simple Memory node (internal name `memoryBufferWindow`, previously called Window Buffer Memory) is the right choice for building and for small single instance bots, as long as you know its rules:

- **Storage key.** Messages are stored under the workflow ID plus the session ID, so two workflows never share memory even with the same session ID, and a copy of a workflow starts with empty memory.
- **Lifetime.** Sessions not accessed for 60 minutes are removed the next time any session is touched. A restart of n8n removes everything. On n8n Cloud, version updates restart the instance.
- **Scaling.** The node carries a notice that it stores memory locally in the n8n instance, is not compatible with queue mode or multi main setups because memory is not shared across workers, and that production use with scaling should use Redis, Postgres or another persistent memory node. In queue mode two consecutive messages from the same user can land on different workers, so the second one sees no history at all.
- **Old versions.** The agent's documentation lists "Error in sub-node Simple Memory" as a known issue that most often comes from a workflow or template that uses an older version of the node, and the fix is to delete the node and add a fresh one.

If you need memory that survives a restart, works behind a load balancer, or can be inspected in a database, use a database backed node. The swap is a single node: the session key and the context window length have the same meaning in all of them.

## Postgres Chat Memory in depth

Postgres Chat Memory stores every message as a row and is the usual production choice because almost every n8n deployment already has Postgres nearby, and because Supabase and other managed Postgres services work with the same node.

**Setup.** Add a Postgres credential, pick it in the node, and leave **Table Name** on its default `n8n_chat_histories` or set your own. The node validates the name: letters, digits and underscores only, with an optional `schema.` prefix, otherwise it fails with "Invalid table name". The table is created automatically on first use with three columns: an `id` serial primary key, `session_id` as text up to 255 characters, and `message` as JSONB holding the message type and content. The database user therefore needs permission to create the table once, and to read, insert and delete rows afterwards.

**How reads work.** On every turn the node selects all rows for the session ordered by `id`, converts them back into messages, and the window cut happens afterwards in memory. That has two consequences for a busy bot: the table is never pruned by n8n, and a session with thousands of rows is read in full on every message even though only the last `k × 2` reach the model. Add an index on `session_id` as soon as the table has real traffic, and give yourself a timestamp to prune by, because the default table has none:

```sql
CREATE INDEX IF NOT EXISTS n8n_chat_histories_session_idx ON n8n_chat_histories (session_id);
ALTER TABLE n8n_chat_histories ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
DELETE FROM n8n_chat_histories WHERE created_at < now() - interval '30 days';
```

The node inserts only `session_id` and `message`, so a column with a default is filled without any change to the workflow. Run the delete from a scheduled workflow with the Postgres node, or from a database job.

**Session scoping applies here too.** With Session ID on the default option and node version 1.4, the stored `session_id` is your session ID plus the memory node's name. If you query the table and see values like `abc123__Postgres_Chat_Memory`, that is the scoping at work, not corruption. Query with a `LIKE 'abc123__%'` pattern or switch the node to Define below for plain keys.

**Errors.** "Error in sub-node Postgres Chat Memory" is the wrapper n8n puts around database failures: a refused connection, wrong credentials, a missing database, SSL requirements, or a user without CREATE rights on first run. Use the credential's test button first, then check the table exists and the user can write to it.

## Clearing, inspecting and injecting memory with Chat Memory Manager

The Chat Memory Manager is a regular node with a Memory connector. Connect a memory node to it and it operates on that memory for the resolved session:

| Operation Mode | What it does | Notes |
|---|---|---|
| Get Many Messages | Returns the stored messages | Simplify Output (default on) returns sender and text only; Group Messages (default on) returns one item with messages and messagesCount |
| Insert Messages | Adds AI, System or User messages | Insert Mode: Insert Messages adds alongside existing ones; Override All Messages replaces the history; Hide Message in Chat keeps a message out of the chat UI |
| Delete Messages | Removes messages | Delete Mode: Last N (Messages Count default 2) or All Messages |

**Clearing memory** is Delete Messages with All Messages. The usual pattern is a command: an If node checks whether the incoming text is `/reset`, the true branch runs the Chat Memory Manager in delete mode and replies "Memory cleared", the false branch goes to the agent. The manager must address the same session as the agent, so in the default Session ID mode connect the very same memory node to both the manager and the agent, or use Define below with the same key on both memory nodes; two default mode memory nodes would be scoped to different buckets and the delete would clear nothing the agent uses.

**Inspecting memory** is Get Many Messages. With the defaults you receive one item with a `messages` array of objects like `{ "human": "...", "ai": "..." }` and a `messagesCount`. That is also the hook for a token budget the memory nodes do not offer: load the messages, measure them, and if they are too large delete the oldest ones or override the history with a summary. This Code node, in Run Once for All Items mode, turns the manager's output into a decision:

```mjs
const { messages } = $input.first().json;
const characters = messages.reduce(
  (sum, message) => sum + Object.values(message).join(' ').length,
  0,
);
return [{
  json: {
    messagesCount: messages.length,
    approxTokens: Math.ceil(characters / 4),
    shouldTrim: characters > 12000,
  },
}];
```

Four characters per token is a rough English average, good enough to decide when to act. Follow it with an If node and a second Chat Memory Manager that deletes the last N messages or overrides the history with a short system message that summarises the conversation so far. The [Code node guide](/blog/n8n-code-node-guide) covers the return format this relies on.

**Injecting context** is Insert Messages. A System message inserted once at the start of a session is a cheap way to give the agent facts about the current user without putting them in the agent's system prompt for everyone, and Hide Message in Chat keeps it out of the hosted chat window. Remember that inserted messages count towards the context window like any other.

Alternatives to the manager exist for each store: a new session ID always starts fresh, Postgres rows can be deleted with a query, and Simple Memory clears itself after 60 minutes idle or on restart.

## Load Previous Session in the Chat Trigger

When the chat is public, the Chat Trigger has a **Load Previous Session** option. Set to **From Memory**, a Memory connector appears on the trigger, and the hosted chat shows the earlier messages of the session when the page loads. The documentation recommends connecting the same memory node to both the Chat Trigger and the Agent so that both read a single source of truth, and its common issues page notes that misconfiguring this often shows up as a "workflow could not be started!" error.

The scoping rule explains the recommendation. In the default Session ID mode the stored key includes the memory node's name, so a second memory node on the trigger would read a different bucket from the one the agent writes to, and the chat would load nothing. One shared node, or two nodes with the same Define below key, is the only configuration that works.

## A per user Telegram bot, end to end

A worked example ties the rules together. The goal is a Telegram bot where every chat has its own memory that survives restarts:

1. **Telegram Trigger** on new messages.
2. **AI Agent** with Prompt set to Define below and the text `{{ $json.message.text }}`, a chat model connected, and your system message.
3. **Postgres Chat Memory** connected to the agent's Memory connector, Session ID set to **Define below**, Key `{{ $json.message.chat.id }}`, Context Window Length 10.
4. **Telegram** node that sends `{{ $json.output }}` back to `{{ $('Telegram Trigger').item.json.message.chat.id }}`.

Add a `/reset` branch with a Chat Memory Manager connected to the same Postgres Chat Memory node, and a scheduled workflow that prunes rows older than 30 days. For a group chat where each member should have a private memory, change the key to combine the chat ID and the sender ID:

```txt
{{ $json.message.chat.id + '_' + $json.message.from.id }}
```

For WhatsApp, replace the key with `{{ $json.messages[0].from }}`; for a webhook from your own app, send a `sessionId` in the body and either leave the default option, which reads it, or reference it explicitly as `{{ $json.body.sessionId }}`. The webhook side of that pattern is covered in the [webhook troubleshooting guide](/blog/n8n-webhook-not-working-2026).

## Fixing the common failures

| Symptom or message | Cause | Fix |
|---|---|---|
| "No session ID found" | Session ID is on Connected Chat Trigger Node but the input has no `sessionId` field and there is no Chat Trigger | Switch to Define below and set a key, or add a `sessionId` field to the incoming data |
| "Key parameter is empty" | Define below is selected with an empty Key | Enter a static key or an expression that resolves for the first item |
| "Invalid session ID" | The key resolves to an object or array | Point the expression at a text or number field |
| The agent forgets after a while | Simple Memory drops sessions idle for 60 minutes and loses everything on restart | Use Postgres or Redis Chat Memory, or accept the limit for prototypes |
| Memory vanished after an update or deploy | Simple Memory lives in the process; n8n Cloud updates and self hosted restarts clear it | Use a database backed memory node |
| Every user sees the same conversation | A static key, or a key that is identical for all users | Use a per user expression such as the chat or user ID |
| Two agents, or the trigger and the agent, do not share history | Two memory nodes in the default mode are scoped to their own node names since version 1.4 | Connect one memory node to both, or use Define below with the same key |
| History disappeared after renaming the memory node | The default mode includes the node name in the stored key | Rename it back, or switch to Define below with an explicit key |
| "Error in sub-node Simple Memory" | An old node version from an imported template | Delete the node and add a new Simple Memory node |
| "Error in sub-node Postgres Chat Memory" | Connection, credentials, SSL, missing database or no CREATE rights | Test the credential, create the table or grant rights, check network and SSL |
| "Invalid table name" | Table Name contains characters other than letters, digits, underscores and one schema prefix | Rename the table |
| Works in test, forgets in production | Queue mode or multi main with Simple Memory | Use a database backed memory node |
| Only the last couple of turns are remembered | Context Window Length counts messages and tool calls consume extra messages | Raise the window or reduce tool use per turn |
| Batched items write into one session | The agent resolves memory for the first item only | Run one item per execution with Loop Over Items at batch size 1 or a sub-workflow |
| Chat Memory Manager delete does not clear the agent's memory | The manager addresses a different memory node or key | Connect the same memory node, or match the Define below key |
| Postgres table grows and the bot slows down | Rows are never pruned and every row of a session is read each turn | Add an index on session_id, a created_at column, and a scheduled delete |
| Load Previous Session shows nothing | The trigger's memory node reads a different scoped bucket | Connect the same memory node to the trigger and the agent |

## A checklist before publishing an agent with memory

- The memory node is a database backed one if the instance runs in queue mode, has more than one main, restarts for updates, or the bot matters.
- Session ID is Define below with an expression that is stable per conversation and unique per user or chat, unless a Chat Trigger provides it.
- Every node that must share history, including Chat Memory Manager and the Chat Trigger's Load Previous Session, is connected to the same memory node or uses the same Define below key.
- Context Window Length matches the conversation style and the budget, and the memory node is the current version so the window actually applies.
- The agent receives one item per execution, or runs inside a loop with batch size 1 or a sub-workflow.
- For Postgres: an index on session_id, a created_at column with a default, and a scheduled prune are in place before real traffic.
- A `/reset` or equivalent clear command exists, connected to the same memory node as the agent.
- A manual test with two different session IDs confirmed that the conversations stay separate before publishing.

## Frequently Asked Questions

### How does the Simple Memory node store chat history in n8n?

It keeps the messages inside the running n8n process, in a map keyed by the workflow ID and the session ID, and returns the last context window of them to the agent on every run. Sessions that have not been accessed for 60 minutes are removed the next time any session is used, and a restart, an update or a crash clears everything. It is not shared across workers in queue mode or multi main setups, so use Postgres or Redis Chat Memory for production bots that must keep history.

### What does No session ID found mean in n8n?

The memory node is set to Connected Chat Trigger Node and could not find a field called sessionId on the incoming item or on a Chat Trigger in the workflow. A Chat Trigger provides that field automatically; Telegram, WhatsApp, Slack and webhook triggers do not. Switch Session ID to Define below and enter a key expression such as the chat ID from your trigger, or add a sessionId field to the data before the agent.

### How do I give each user their own memory in an n8n AI agent?

Set the memory node's Session ID to Define below and use an expression that is unique per user or chat and stable across their messages, for example the Telegram chat ID, the WhatsApp phone number or a user ID from your own webhook body. The value must resolve to text or a number, and the agent resolves it for the first item of the execution, so make sure each execution handles one message, or run the agent inside a loop with batch size 1.

### How do I clear an AI agent's memory in n8n?

Connect a Chat Memory Manager node to the same memory node the agent uses, set Operation Mode to Delete Messages and Delete Mode to All Messages, and trigger it from a command such as a reset keyword. Because the default Session ID mode scopes the stored key to the memory node's name, the manager must use the very same memory node or a Define below key that matches. Starting a new session ID also gives the user a clean conversation, and Postgres rows can be deleted directly with a query.

### Should I use Simple Memory or Postgres Chat Memory?

Use Simple Memory while building and for small bots on a single instance where losing history after 60 minutes idle or on restart is acceptable. Use Postgres Chat Memory, or Redis Chat Memory when you want automatic expiry, for anything published to real users, for n8n Cloud bots that must keep history across updates, and for any instance that runs in queue mode or with several main processes. The session key and context window settings mean the same thing in all of them, so switching is a single node swap.

## Verification Notes

The behaviour described here was read on 9 November 2026 from the n8n 2.46.6 sources of the Simple Memory node (`MemoryBufferWindow.node.ts`, versions 1 to 1.4), the Postgres Chat Memory node (`MemoryPostgresChat.node.ts`, versions 1 to 1.4), the Redis Chat Memory node, the shared memory descriptions, the session ID helper (`getSessionId` and `coerceSessionIdToString` in the LangChain utilities), the Chat Memory Manager node, the Tools Agent memory handling (`memoryManagement.ts` and the agent's memory lookup) and LangChain's window buffer memory and Postgres message history, and checked against the official documentation for the memory nodes, the Chat Trigger and the agent's common issues. The session key resolution and scoping, the one hour expiry and the window arithmetic were reproduced in Node.js 24 with JavaScript ports of that logic against synthetic messages. These checks confirm the logic; they are not a substitute for running the workflows in your own instance, and they do not exercise a live model, database or chat client.

## Sources and Further Reading

- n8n Docs: [Simple Memory](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.memorybufferwindow) and its [common issues](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.memorybufferwindow/common-issues)
- n8n Docs: [Postgres Chat Memory](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.memorypostgreschat)
- n8n Docs: [Redis Chat Memory](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.memoryredischat)
- n8n Docs: [Chat Memory Manager](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.memorymanager)
- n8n Docs: [How memory works](https://docs.n8n.io/build/integrate-ai/understand-ai-components/how-memory-works)
- n8n Docs: [Chat Trigger](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-langchain.chattrigger) and its [common issues](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-langchain.chattrigger/common-issues)
- n8n Docs: [AI Agent common issues](https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/common-issues)
- n8n source: [MemoryBufferWindow.node.ts](https://github.com/n8n-io/n8n/blob/master/packages/%40n8n/nodes-langchain/nodes/memory/MemoryBufferWindow/MemoryBufferWindow.node.ts)
- n8n source: [MemoryPostgresChat.node.ts](https://github.com/n8n-io/n8n/blob/master/packages/%40n8n/nodes-langchain/nodes/memory/MemoryPostgresChat/MemoryPostgresChat.node.ts)
- n8n source: [memory helpers](https://github.com/n8n-io/n8n/blob/master/packages/%40n8n/nodes-langchain/utils/helpers.ts) (`getSessionId`, scoping) and [agent memory management](https://github.com/n8n-io/n8n/blob/master/packages/%40n8n/nodes-langchain/utils/agent-execution/memoryManagement.ts)
- LangChain source: [BufferWindowMemory](https://github.com/langchain-ai/langchainjs/blob/main/libs/langchain-classic/src/memory/buffer_window_memory.ts)
- npm registry: [n8n latest release metadata](https://registry.npmjs.org/n8n/latest) (version 2.46.6 at the time of writing)
- Cover photo: [Artem Podrez on Pexels](https://www.pexels.com/photo/a-person-writing-on-a-paper-with-graph-6779570/); inline photo: [cottonbro studio on Pexels](https://www.pexels.com/photo/person-using-a-laptop-on-a-table-7439136/). Both are illustrative photographs under the Pexels licence, not n8n screenshots.
