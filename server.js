import { WebSocketServer } from 'ws';
import jsonlFile from 'jsonl-db';
import { glob } from 'glob';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { typeDefs } from './schema.js';
import { resolvers } from './resolvers.js';

export const createApolloServer = async (listenOptions = { port: 4000 }) => {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  const { url } = await startStandaloneServer(server, {
    listen: listenOptions,
  });

  return { server, url };
};

const { url } = await createApolloServer();
console.log(`Apollo server ready at : ${url}`);

// webSocket server
const wss = new WebSocketServer({
  port: 8080,
});

wss.on('connection', async function connection(ws, req) {
  console.log('websocket connected');
  console.log(req.url);

  ws.on('message', async (data) => {
    const str = data.toString();
    const jsonData = JSON.parse(str);
    console.log('jsonData: ', jsonData); // jsonData: { sequenceNumber: 1}
    let gameNumber = jsonData.sequenceNumber;
    let pointer = 1;

    const jsfiles = await glob(`**/${req.url}_events.jsonl`, {
      ignore: 'node_modules/**',
    });

    console.log('Emitting', jsfiles[0]);
    const eventsFile = jsonlFile(jsfiles[0]);

    await eventsFile.read((line) => {
      // send out the event of the game
      if (pointer === gameNumber) {
        const dto = {
          type: line.events[0].type,
          actor: line.events[0].actor,
          action: line.events[0].action,
          target: line.events[0].target,
        };
        ws.send(JSON.stringify(dto));
        if (line.events[0].type === 'player-acquired-item') {
        }

        // reach the end of the game
        if (line.events[0].type === 'team-won-game') {
          pointer += 1;
        }
      }

      // move the pointer to the next game
      if (pointer < gameNumber) {
        if (line.events[0].type === 'team-won-game') {
          pointer += 1;
        }
      }

      // game ended
      if (pointer > gameNumber) {
        return true;
      }
    });

    // reset the pointer
    pointer = 1;
  });

  // eventsFile.read((line) => ws.send(JSON.stringify(line)));
});
