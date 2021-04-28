const { expect } = require('chai');
const knex = require('knex');
const app = require('../src/app');
const { makeFoldersArray, makeMaliciousFolders } = require('../test/folders.fixtures');
const supertest = require('supertest');

describe('Folders endpoints', function(){
    const { testFolders, expectedFolders } = makeFoldersArray();

    let db

    before('Make knex instance', () => {
        db = knex({
            client:'pg',
            connection: process.env.TEST_DB_URL,
        });

        app.set('db', db);
    });

    after('disconnect from the db', () => db.destroy());

    before('clean the table', () => db.raw('TRUNCATE noteful_folders, noteful_notes RESTART IDENTITY CASCADE'));
    
    afterEach('cleanup', () => db.raw('TRUNCATE noteful_folders, noteful_notes RESTART IDENTITY CASCADE'))

    describe(`GET /api/folders`, () => {
        context(`Given there are folders in the database`, () => {
            const { testFolders, expectedFolders } = makeFoldersArray();
    
            beforeEach('insert test folders', () => {
                return db
                    .into('noteful_folders')
                    .insert(testFolders)
            })
    
            it(`GET /folders responds with a 200 and all of the folders`, () => {
                return supertest(app)
                    .get('/api/folders')
                    .expect(200, expectedFolders)
            });
        });
    });

    describe(`GET /api/folders/:folder_id`, () => {
        context('Given no folders', () =>{
            
            it('responds with a 404', () => {
                const folderId = 12345;
                return supertest(app)
                    .get(`/api/folders/${folderId}`)
                    .expect(404, { error: {
                        message: `Folder doesn't exist`
                    }
                });
            });
        });
        
        context(`Given there are folders in the database`, () => {
            const { testFolders, expectedFolders } = makeFoldersArray();
    
            beforeEach('insert test folders', () => {
                return db
                    .into('noteful_folders')
                    .insert(testFolders)
            })
    
            it(`responds with a 200 and the specified folder`, () => {
                const folderId = 2;
                const expectedFolder = expectedFolders[folderId -1]
                return supertest(app)
                    .get(`/api/folders/${folderId}`)
                    .expect(200, expectedFolder)
            });
        });

        context(`Given an XSS attack`, () => {
           const { maliciousFolder, cleanFolder } = makeMaliciousFolders();
            
            const badFolder = {
                id:911,
                name: 'Naughty naughty very naughty <script>alert("xss");</script>' 
            }

            beforeEach('insert malicious folder', () => {
                return db
                    .into('noteful_folders')
                    .insert([ maliciousFolder ])
            });

            it('removes XSS attack content', () => {
                return supertest(app)
                    .get(`/api/folders/${maliciousFolder.id}`)
                    .expect(200)
                    .expect(res => {
                        expect(res.body.name).to.eql(cleanFolder.name)   
                    })
            })
        })
    });

    describe(`POST /api/folders`, () => {
        it('creates a folder, responding with a 201 and the new folder', () => {
            
            const newFolder = {
                name: 'New folder'
            }
            return supertest(app)
                .post('/api/folders')
                .send(newFolder)
                .expect(201)
                .then(res => {
                    expect(res.body.name).to.eql(newFolder.name)
                    expect(res.body).to.have.property('id')
                    expect(res.headers.location).to.eql(`/api/folders/${res.body.id}`)
                });
        });

        it(`responds with a 400 and error message when 'name' is missing`, () => {
            return supertest(app)
                .post('/api/folders')
                .send({})
                .expect(400, { 
                    error: { message: `Missing 'name' in request body`}
                });
        });
    });

    describe(`DELETE /api/folders/:folder_id`, () => {
        
        context(`Given no folders`, () => {
            it(`responds with a 404`, () => {
                const folderId = 123456;
                return supertest(app)
                    .delete(`/api/folders/${folderId}`)
                    .expect(404, { 
                        error: { message: `Folder doesn't exist`}
                    });
            });
        });
        
        context(`Given there are folders in the database`, () => {
            const { testFolders, expectedFolders } = makeFoldersArray();
            
            beforeEach('insert folders', () => {
                return db
                    .into('noteful_folders')
                    .insert(testFolders)
            })
            
            
            it('responds with a 204 and removes the folder', () => {
                const idToRemove = 2;
                const expected = expectedFolders.filter(folder => folder.id !== idToRemove)

                return supertest(app)
                    .delete(`/api/folders/${idToRemove}`)
                    .expect(204)
                    .then(res => 
                        supertest(app)
                            .get('/api/folders')
                            .expect(expected))
            });
        });
    });

    describe(`PATCH api/folders/:folder_id`, () => {
        context('Given no folders', () => {
            it('responds with 404', () => {
                const folderId = 12345;
                return supertest(app)
                    .patch(`/api/folders/${folderId}`)
                    .expect(404, {
                        error: { message: `Folder doesn't exist`}
                    });
            });
        });

        context('Given there are folders in the database', () => {
            
            beforeEach('insert folders', () => {
                return db
                    .into('noteful_folders')
                    .insert(testFolders)
            });

            it('responds with 204 and updates the folder', () => {
                const idToUpdate = 2;
                const updatedFolder = {
                    name: "Updated folder name"
                }
                const returnedFolder = {
                    ...expectedFolders[idToUpdate-1],
                    ...updatedFolder,
                }

                return supertest(app)
                    .patch(`/api/folders/${idToUpdate}`)
                    .send(updatedFolder)
                    .expect(204)
                    .then(res =>
                        supertest(app)
                            .get(`/api/folders/${idToUpdate}`)
                            .expect(returnedFolder))
            });

            it('responds with 404 when no required fields are supplied', () => {
                const idToUpdate = 2;
                return supertest(app)
                    .patch(`/api/folders/${idToUpdate}`)
                    .send({ irrelevantField: 'foo' })
                    .expect(400, { 
                        error: { message: `Request body must contain 'name'`}
                    });
            });

            it('')

        });
    })
    
    
    
});