import { BaseSeeder } from '../src/seeders/base_seeder.js'
export default class CircularSeeder1 extends BaseSeeder {
  static dependencies = ['CircularSeeder2']
  async run() {}
}
