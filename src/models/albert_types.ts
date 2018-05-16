export interface ClassType {
  [key: string]: string;

  /**
   * CS-GY 9963
   */
  classNumber: string;

  /**
   * ADVANCED PROJECT IN COMPUTER SCIENCE
   */
  classTitle: string;

  /**
   * 01/22/2018 - 05/07/2018
   */
  dates: string;

  /**
   * "TBA" / "01/22/2018 - 05/07/2018"
   */
  'days_times': string;

  /**
   * https://m.albert.nyu.edu/app/catalog/classsection/NYUNV/1184/16616
   */
  href: string;

  /**
   * Andrew Nealen
   */
  instructor: string;

  /**
   * Section: BK20-PRO (16616)
   * Session: Regular Academic Session
   * Days/Times:  TBA
   * Dates:  01/22/2018 - 05/07/2018
   * Instructor: Andrew Nealen
   * Status: Open
   */
  raw: string;

  /**
   * BK20-PRO (16616)
   */
  section: string;

  /**
   * Regular Academic Session
   */
  session: string;

  /**
   * Open / Closed
   */
  status: string;
}

export interface SyncStatType {
  syncedAt: Date;
  success: Boolean;
  stats?: {
    opens: number;
    closes: number;
  };
  error?: string;
}

export interface WatchTableItemType {
  [key: string]: string | number;

  uid: string;
  class_id: string;
  created_at: number;
  last_notified: number | undefined;
}
