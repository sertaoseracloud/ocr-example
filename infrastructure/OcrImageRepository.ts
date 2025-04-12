import { IImageRepository } from "../domain/IImageRepository";
import { OcrImage } from "../domain/OCRImage";
import sql from "mssql";


export class OcrImageRepository implements IImageRepository {
  constructor(private readonly pool: sql.ConnectionPool) {}

  async save(fileName: string, url: string): Promise<void> {
      try {
        await this.pool.connect();
        const result = await this.pool.request()
          .input("FileName", sql.NVarChar, fileName)
          .input("Url", sql.NVarChar, url)
          .query(`
            INSERT INTO OcrImages (FileName, Url)
            VALUES (@FileName, @Url)
          `);
        if (result.rowsAffected[0] === 0) {
            throw new Error('Failed to save image to the database');
        }
        return result;
        } catch (err) {
            throw new Error('Error querying the database');
        } finally {
            sql.close();
        }
  }

  async getAndMarkPendingImages(): Promise<OcrImage[]> {
    try {
      await this.pool.connect();

      const result = await this.pool.request().query(`
      ;WITH cte AS (
        SELECT TOP (100) *
        FROM OcrImages WITH (ROWLOCK, READPAST)
        WHERE Status = 'PENDING'
        ORDER BY UploadDate ASC
      )
      UPDATE cte
      SET Status = 'PROCESSING'
      OUTPUT 
        INSERTED.Id,
        INSERTED.FileName,
        INSERTED.Url,
        INSERTED.UploadDate,
        INSERTED.Status,
        INSERTED.IsPrescription;
    `);

      return result.recordset.map(row => new OcrImage(
        row.Id,
        row.FileName,
        row.Url,
        row.UploadDate,
        row.Status,
        row.IsPrescription
      ));

    } catch (err) {
      throw new Error(`Erro ao buscar ou atualizar registros: ${err}`);
    } finally {
      sql.close();
    }
  }
  async saveOcrResult(id: number, isPrescription: boolean): Promise<void> {
    try {
      await this.pool.connect();
      const result = await this.pool.request()
        .input("Id", sql.Int, id)
        .input("IsPrescription", sql.Bit, isPrescription)
        .query(`
          UPDATE OcrImages
          SET IsPrescription = @IsPrescription, Status = 'PROCESSED'
          WHERE Id = @Id
        `);
      if (result.rowsAffected[0] === 0) {
          throw new Error('Failed to update image status in the database');
      }
    } catch (err) {
        throw new Error('Error querying the database');
    } finally {
        sql.close();
    }
  }
  async markAsError(id: number): Promise<void> {
    try {
      await this.pool.connect();
      const result = await this.pool.request()
        .input("Id", sql.Int, id)
        .query(`
          UPDATE OcrImages
          SET Status = 'ERROR'
          WHERE Id = @Id
        `);
      if (result.rowsAffected[0] === 0) {
          throw new Error('Failed to update image status in the database');
      }
    } catch (err) {
        throw new Error('Error querying the database');
    } finally {
        sql.close();
    }
  }
}