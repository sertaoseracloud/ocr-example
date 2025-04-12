import { Context } from "@azure/functions";
import { IImageRepository } from "../domain/IImageRepository";
import { OcrImage } from "../domain/OCRImage";
import sql from "mssql";


export class OcrImageRepository implements IImageRepository {
  constructor(
    private readonly pool: sql.ConnectionPool,
    private readonly context: Context,
  ) {}

  async save(fileName: string, url: string): Promise<void> {
      this.context.log("Iniciando cadastro dos metadados da imagem");
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
        this.context.log("Imagem armazenada com sucesso", fileName);
        return result;
        } catch (err) {
            this.context.log("Erro ao armazenar imagem", err);
            throw new Error('Error querying the database');
        } finally {
            sql.close();
        }
  }

  async getAndMarkPendingImages(): Promise<OcrImage[]> {
    this.context.log("Buscando imagens pendentes");
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
      if (result.rowsAffected[0] === 0) {
          throw new Error('No pending images found');
      }
      this.context.log("Imagens pendentes encontradas", result.recordset.length);
      return result.recordset.map(row => new OcrImage(
        row.Id,
        row.FileName,
        row.Url,
        row.UploadDate,
        row.Status,
        row.IsPrescription
      ));

    } catch (err) {
      this.context.log("Erro ao buscar imagens pendentes", err);
      throw new Error(`Erro ao buscar ou atualizar registros: ${err}`);
    } finally {
      sql.close();
    }
  }
  async saveOcrResult(id: number, isPrescription: boolean): Promise<void> {
    this.context.log("Atualizando status da imagem");
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
      this.context.log("Status da imagem atualizado com sucesso", id);
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