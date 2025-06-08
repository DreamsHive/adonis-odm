import { BaseSeeder } from '../src/seeders/base_seeder.js'
export default class CircularSeeder2 extends BaseSeeder {
  static dependencies = ['CircularSeeder1']
  async run() {}
}
