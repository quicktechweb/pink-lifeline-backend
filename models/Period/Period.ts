export interface IBleeding {
  id: 0 | 1;
  title: string;
    flowLevel?: 0 | 1 | 2 | 3;

}


export interface ISymptom {
  title?: string;
  id?: number;
  isRecent?: 0 | 1;
}

export interface ISpotting {
  title?: string;
  id?: number;
}

export interface IPeriod {
  date: Date;

  bleeding: IBleeding;

  symptoms: ISymptom[];

  spotting: ISpotting[];
}

export interface IPeriodTracker {
//   userId: string;

  startDate: Date;

  endDate?: Date;

  period: IPeriod[];

  createdAt?: Date;

  updatedAt?: Date;
}