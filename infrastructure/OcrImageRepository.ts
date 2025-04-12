import { IImageRepository } from "../domain/IImageRepository";
import { OcrImage } from "../domain/OCRImage";
import { Pool } from "pg";

export class OcrImageRepository implements IImageRepository {
  constructor(
    private readonly pool: Pool, // use Pool, não Client
  ) { }

  async save(fileName: string, url: string): Promise<void> {
    try {
      await this.pool.query(
        `
          INSERT INTO OcrImages (FileName, Url)
          VALUES ($1, $2)
        `,
        [fileName, url]
      );
    } catch (err) {
      throw new Error(`Error inserting image: ${(err as Error).message}`);
    }
  }

  async getAndMarkPendingImages(): Promise<OcrImage[]> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(`
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

      await client.query('COMMIT');

      return result.rows.map(row => new OcrImage(
        row.id,
        row.filename,
        row.url,
        row.uploaddate,
        row.status,
        row.isprescription
      ));
    } catch (err) {
      await client.query('ROLLBACK');
      throw new Error(`Error fetching or updating records: ${(err as Error).message}`);
    } finally {
      client.release();
    }
  }

  async saveOcrResult(id: number, isPrescription: boolean): Promise<void> {
    try {
      const result = await this.pool.query(
        `
          UPDATE OcrImages
          SET IsPrescription = $1, Status = 'processed'
          WHERE Id = $2
        `,
        [isPrescription, id]
      );

      if (result.rowCount === 0) {
        throw new Error('No image found to update');
      }
    } catch (err) {
      throw new Error(`Error updating OCR result: ${(err as Error).message}`);
    }
  }

  async markAsError(id: number): Promise<void> {
    try {
      const result = await this.pool.query(
        `
          UPDATE OcrImages
          SET Status = $1
          WHERE Id = $2
        `,
        ['error', id] // status enum is lowercase
      );

      if (result.rowCount === 0) {
        throw new Error('No image found to mark as error');
      }
    } catch (err) {
      throw new Error(`Error marking image as error: ${(err as Error).message}`);
    }
  }
}
