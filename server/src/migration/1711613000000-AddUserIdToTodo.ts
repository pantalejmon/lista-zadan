import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class AddUserIdToTodo1711613000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'todo',
      new TableColumn({
        name: 'userId',
        type: 'varchar',
        isNullable: true,
      }),
    );
    await queryRunner.createIndex(
      'todo',
      new TableIndex({
        name: 'IDX_todo_userId',
        columnNames: ['userId'],
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('todo', 'IDX_todo_userId');
    await queryRunner.dropColumn('todo', 'userId');
  }
}
