import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateTodoTable1711612800000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'todo',
        columns: [
          { name: 'id', type: 'varchar', isPrimary: true },
          { name: 'text', type: 'varchar', isNullable: false },
          { name: 'completed', type: 'boolean', default: false },
          { name: 'date', type: 'varchar', isNullable: false },
          { name: 'time', type: 'varchar', isNullable: true },
          { name: 'createdAt', type: 'bigint', isNullable: false },
          { name: 'recurrenceGroupId', type: 'varchar', isNullable: true },
        ],
        indices: [
          { name: 'IDX_todo_date', columnNames: ['date'] },
          { name: 'IDX_todo_recurrenceGroupId', columnNames: ['recurrenceGroupId'] },
        ],
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('todo');
  }
}
