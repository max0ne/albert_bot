
export type ReplyFunction = (msg: string) => void;

export type NextFunction = (ctx: Context) => void;

export interface Context {
  reply: ReplyFunction;
  from: {
    id: string;
  };

  message: {
    text: string;
  };
}
