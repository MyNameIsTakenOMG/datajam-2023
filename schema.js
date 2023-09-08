export const typeDefs = `
  type Query{
    series(seriesId: String!) : SeriesState
  }

  type SeriesState {
    id: String!
    format: String!
    started: Boolean!
    finished: Boolean!
    teams: [TeamSeriesState!]!
    games: [GameState!]!
  }

  type TeamSeriesState {
    id: String
    name: String
    score: Int
    won: Boolean
  }

  type GameState {
    id: String
    sequenceNumber: Int
    map: GameMap
    started: Boolean
    finished: Boolean
    paused: Boolean
    teams: [TeamGameState!]!
    dratfActions: [DraftAction]
  }

  type GameMap{
    name: String
  }

  type TeamGameState{
    id: String
    name: String
    side: String
    won: Boolean
    kills: Int
    killAssistsGiven: Int
    deaths: Int
    players: [PlayerState]
  }

  type PlayerState{
    id: String
    name: String
    character: Character
    money: Int
    inventoryValue: Int
    netWorth: Int
    kills: Int
    killAssistsGiven: Int
    deaths: Int
    items: [Item]!
    objectives: [Objective]!
  }

  type Objective{
    id: String
    type: String
    completionCount: Int
  }

  type Item{
    id: String
    equipped: Boolean
    stashed: Boolean
  }

  type Character{
    id: String
    name: String
  }

  type DraftAction{
    id: String
    sequenceNumber: Int
    type: String
    drafter: Drafter
    draftable: Draftable
  }

  type Drafter{
    id: String
    type: String
  }

  type Draftable{
    id: String
    type: String
    name: String
  }
`;
