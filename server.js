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
        let message = eventTransform(line);
        ws.send(JSON.stringify(message));

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

const eventTransform = (line) => {
  let message = {};
  // if it's a ban/pick event
  if (line.events[0].type.match(/(banned|picked)/)) {
    message = {
      log: `${line.events[0].actor.state.series.name} ${line.events[0].action} ${line.events[0].target.id}`,
      draftAction: {
        sequenceNumber:
          line.events[0].seriesStateDelta.games[0].draftActions[0]
            .sequenceNumber,
        type: line.events[0].action,
        drafter: {
          id: line.events[0].actor.id,
          type: line.events[0].actor.type,
          name: line.events[0].actor.state.series.name,
        },
        draftable: {
          id: line.events[0].target.id,
          type: line.events[0].target.type,
        },
      },
    };
  }
  // if it's an acquired/equipped/unequipped/stashed/unstashed event
  else if (
    line.events[0].type.match(/acquired|equipped|unequipped|stashed|unstashed/)
  ) {
    message = {
      log: `${line.events[0].actor.state.series.name} ${
        line.events[0].action
      } ${line.events[0].target.id.replaceAll('_', ' ')}`,
      itemAction: {
        id: line.events[0].actor.id,
        teamId: line.events[0].actor.state.teamId,
        type: line.events[0].action,
        item: {
          id: line.events[0].target.state.id,
          equipped: line.events[0].target.state.equipped,
          stashed: line.events[0].target.state.stashed,
        },
      },
    };
  }
  // if it's a lost-item event
  else if (line.events[0].type.match(/lost-item/)) {
    message = {
      log: `${line.events[0].actor.state.series.name} ${
        line.events[0].action
      } ${line.events[0].target.id.replaceAll('_', ' ')}`,
      itemAction: {
        id: line.events[0].actor.id,
        teamId: line.events[0].actor.state.teamId,
        type: line.events[0].action,
        item: {
          id: line.events[0].target.state.id,
        },
      },
    };
  }
  // if it's a game-set-clock event
  else if (line.events[0].type.match(/game-set-clock/)) {
    const teams = line.events[0].actor.state.teams.map((team) => {
      return {
        id: team.id,
        name: team.name,
        side: team.side,
        won: team.won,
        players: team.players.map((player) => {
          return {
            id: player.id,
            name: player.name,
            character: player.character.id,
          };
        }),
      };
    });

    message = {
      log: `${line.events[0].type.replaceAll('_', ' ')}`,
      teams: teams,
    };
  }
  // if it's a increaseLevel event
  else if (line.events[0].type.match(/increaseLevel/)) {
    message = {
      log: `${line.events[0].actor.state.name} leveled up`,
      player: {
        teamId: line.events[0].actor.state.teamId,
        id: line.events[0].actor.state.id,
        objective: {
          completionCount:
            line.events[0].actor.state.series.objectives[0].completionCount,
          type: line.events[0].actor.state.series.objectives[0].type,
        },
      },
    };
  }
  // if it's a player-killed-player event
  else if (line.events[0].type.match(/player-killed-player/)) {
    message = {
      log: `${line.events[0].actor.state.series.name} ${line.events[0].action} ${line.events[0].target.state.series.name}`,
      player: {
        actor: {
          id: line.events[0].actor.id,
          assists:
            line.events[0].actor.stateDelta.game.killAssistsReceivedFromPlayer,
          teamId: line.events[0].actor.state.teamId,
        },
        target: {
          id: line.events[0].target.id,
          teamId: line.events[0].target.state.teamId,
        },
      },
    };
  }
  // if it's a team-killed-player event
  else if (line.events[0].type.match(/team-killed-player/)) {
    message = {
      log: `${line.events[0].actor.state.series.name} ${line.events[0].action} ${line.events[0].target.state.series.name}`,
      teamId: line.events[0].actor.id,
      target: {
        id: line.events[0].target.id,
        teamId: line.events[0].target.state.teamId,
      },
    };
  }

  // if it's a grid, tournament, series-related event
  else if (line.events[0].type.match(/grid|tournament|series/)) {
    message = {
      log: `${line.events[0].type.replaceAll('-', ' ')}`,
    };
  }

  // for rest of the player-related events
  else if (line.events[0].type.match(/player-/)) {
    let log = '';
    if (line.events[0].type.match(/player-selfrevived-player/))
      log = line.events[0].actor.state.series.name + ' self-revived';
    else
      log = line.events[0].type
        .replace(/player/, line.events[0].actor.state.series.name)
        .replaceAll('-', ' ');
    message = {
      log: log,
    };
  }

  // for rest of the team-related events
  else if (line.events[0].type.match(/team-/)) {
    message = {
      log: line.events[0].type
        .replace(/team/, line.events[0].actor.state.series.name)
        .replaceAll('-', ' '),
    };
  }

  // for rest of the game-related events
  else if (line.events[0].type.match(/game-/)) {
    let log = '';
    if (line.events[0].type.endsWith('roshan')) {
      log = 'Roshan respawned';
    } else if (line.events[0].type.endsWith('player')) {
      log = `${line.events[0].target.state.series.name} respawned`;
    } else {
      log = 'Roshan respawn clock set';
    }
    message = {
      log,
    };
  }

  message.eventType = line.events[0].type;
  return message;
};
