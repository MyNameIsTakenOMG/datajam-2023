import fs from 'fs';

export const resolvers = {
  Query: {
    series: async (_, { seriesId }) => {
      const jsonData = await fs.promises.readFile(
        `./data_files/dota/DotA-2-The-International-2022/${seriesId}_state.json`
      );
      const db = JSON.parse(jsonData);
      return db;
    },
  },
};
