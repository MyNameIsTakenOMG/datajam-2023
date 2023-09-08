// we import a function that we wrote to create a new instance of Apollo Server
import { createApolloServer } from './server';

// we'll use supertest to test our server
import request from 'supertest';

// this is the query for our test
const queryData = {
  query: `query($id: String!){
    series(seriesId: $id) {
      finished
      format
      started
      id
      teams {
        id
        name
        score
      }
      games {
        sequenceNumber
      }
    }
  }`,
  variables: { id: '2432302' },
};

describe('apollo server e2e test', () => {
  let server, url;

  // before the tests we spin up a new Apollo Server
  beforeAll(async () => {
    // Note we must wrap our object destructuring in parentheses because we already declared these variables
    // We pass in the port as 0 to let the server pick its own ephemeral port for testing
    ({ server, url } = await createApolloServer({ port: 0 }));
  });

  // after the tests we'll stop the server
  afterAll(async () => {
    await server.stop();
  });

  it('says hello', async () => {
    // send our request to the url of the test server
    const response = await request(url).post('/').send(queryData);
    // console.log('response', response.body.data.series.id);
    expect(response.error).toBeFalsy();
    expect(response.body.data.series.id).toBe(queryData.variables.id);
  });
});
