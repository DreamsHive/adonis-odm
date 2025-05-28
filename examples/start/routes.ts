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
router.post('/test-embedded', '#controllers/cruds_controller.testEmbeddedDocuments')
router.post('/test-seamless-crud', '#controllers/cruds_controller.testSeamlessEmbeddedCRUD')
router.get('/test-advanced-queries', '#controllers/cruds_controller.testAdvancedEmbeddedQueries')
router.get('/test-new-embed-method', '#controllers/cruds_controller.testNewEmbedMethod')
router.get('/view-database', '#controllers/cruds_controller.viewDatabase')
