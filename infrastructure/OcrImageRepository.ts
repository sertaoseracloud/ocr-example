import { Client } from "pg";
import { IImageRepository } from "../domain/IImageRepository";
import { OcrImage } from "../domain/OCRImage";



export class OcrImageRepository implements IImageRepository {
  constructor(
    private readonly pool: Client,
  ) {}

  async save(fileName: string, url: string): Promise<void> {
    try {
      await this.pool.connect();
      const result = await this.pool.query(
        `
          INSERT INTO OcrImages (FileName, Url)
          VALUES ($1, $2)
        `,
        [fileName, url]
      );
      if (result.rowCount === 0) {
        throw new Error('Failed to insert image into the database');
      }
    } catch (err) {
      throw new Error('Error querying the database');
    } finally {
      await this.pool.end();
    }
  }

  async getAndMarkPendingImages(): Promise<OcrImage[]> {
    try {
      await this.pool.connect();
      const result = await this.pool.query(`
        WITH cte AS (
          SELECT *
          FROM OcrImages
          WHERE Status = 'PENDING'
          ORDER BY UploadDate ASC
          LIMIT 100
          FOR UPDATE SKIP LOCKED
        )
        UPDATE OcrImages
        SET Status = 'PROCESSING'
        FROM cte
        WHERE OcrImages.Id = cte.Id
        RETURNING 
          OcrImages.Id,
          OcrImages.FileName,
          OcrImages.Url,
          OcrImages.UploadDate,
          OcrImages.Status,
          OcrImages.IsPrescription;
      `);

      if (result.rowCount === 0) {
        throw new Error('No pending images found');
      }

      return result.rows.map(row => new OcrImage(
        row.id,
        row.filename,
        row.url,
        row.uploaddate,
        row.status,
        row.isprescription
      ));
    } catch (err) {
      throw new Error(`Error fetching or updating records: ${err}`);
    }
  }
  async saveOcrResult(id: number, isPrescription: boolean): Promise<void> {
    try {
      await this.pool.connect();
      const result = await this.pool.query(
        `
          UPDATE OcrImages
          SET IsPrescription = $1, Status = 'PROCESSED'
          WHERE Id = $2
        `,
        [isPrescription, id]
      );
      if (result.rowCount === 0) {
          throw new Error('Failed to update image status in the database');
      }
    } catch (err) {
        throw new Error('Error querying the database');
    } finally {
        this.pool.close();
    }
  }
  async markAsError(id: number): Promise<void> {
     await this.pool.connect();
    try {
      const result = await this.pool.query(
        `
          UPDATE OcrImages
          SET Status = $1
          WHERE Id = $2
        `,
        ['ERROR', id]
      );
      if (result.rowsAffected[0] === 0) {
          throw new Error('Failed to update image status in the database');
      }
    } catch (err) {
        throw new Error('Error querying the database');
    } finally {
      this.pool.close();
    }
  }
}