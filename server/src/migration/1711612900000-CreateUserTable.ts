import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateUserTable1711612900000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'user',
        columns: [
          { name: 'id', type: 'varchar', isPrimary: true },
          { name: 'googleId', type: 'varchar', isNullable: false },
          { name: 'email', type: 'varchar', isNullable: false },
          { name: 'displayName', type: 'varchar', isNullable: false },
          { name: 'avatarUrl', type: 'varchar', isNullable: true },
          { name: 'createdAt', type: 'bigint', isNullable: false },
        ],
        indices: [
          { name: 'IDX_user_googleId', columnNames: ['googleId'], isUnique: true },
        ],
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('user');
  }
}
