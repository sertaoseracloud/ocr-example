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
          WHERE Status = 'pending'
          ORDER BY UploadDate ASC
          LIMIT 100
          FOR UPDATE SKIP LOCKED
        )
        UPDATE OcrImages
        SET Status = 'processing'
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
          SET IsPrescription = $1, Status = 'processed'
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
      await this.pool.end();
    }
  }

  async markAsError(id: number): Promise<void> {
    try {
      await this.pool.connect();
      const result = await this.pool.query(
        `
          UPDATE OcrImages
          SET Status = 'error'
          WHERE Id = $1
        `,
        [id]
      );
      if (result.rowCount === 0) {
        throw new Error('Failed to update image status in the database');
      }
    } catch (err) {
      throw new Error('Error querying the database');
    } finally {
      await this.pool.end();
    }
  }
}