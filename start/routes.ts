/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'

router.get('/', async () => 'It works!')
router.post('/create', '#controllers/cruds_controller.create')
router.get('/debug', '#controllers/cruds_controller.debug')
