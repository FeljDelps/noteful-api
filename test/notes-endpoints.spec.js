const { expect } = require('chai');
const knex = require('knex');
const app = require('../src/app');
const supertest = require('supertest');
const { makeNotesArray, makeFoldersArray, makeNewNote, makeMaliciousNote, makeSanitizedNote } = require('./notes.fixtures');

describe('Notes endpoints', function(){

    const testFolders = makeFoldersArray();
    const testNotes = makeNotesArray();
    const newNote = makeNewNote()[0];
    const maliciousNote = makeMaliciousNote()[0];
    const sanitizedNote = makeSanitizedNote()[0];

    let db
    
    before('Make knex instance', () => {
        db = knex({
            client:'pg',
            connection: process.env.TEST_DB_URL
        });

        app.set('db', db);
    });

    after('disconnect from the db', () => db.destroy());

    before('clean the table', () => db.raw('TRUNCATE noteful_notes, noteful_folders RESTART IDENTITY CASCADE'));

    afterEach('cleanup', () => db.raw('TRUNCATE noteful_notes, noteful_folders RESTART IDENTITY CASCADE'));

    describe(`GET /api/notes`, () => {
        context('given there are no notes', () => {
            it('responds with 200 and an empty list', () => {
                return supertest(app)
                    .get('/api/notes')
                    .expect(200, [])
            });
        });

        context('given there are notes in the database', () => {

            beforeEach('insert folders & notes', () => {
                return db
                    .into('noteful_folders')
                    .insert(testFolders)
                    .then(() => {
                        return db
                            .into('noteful_notes')
                            .insert(testNotes)
                    });
            });

            it(`responds with a 200 and all the notes`, () => {
                return supertest(app)
                    .get('/api/notes')
                    .expect(200, testNotes)
            });
            
        });

        context('given an XSS attack', () => {
            beforeEach('insert folders & malicious notes', () => {
                return db
                    .into('noteful_folders')
                    .insert(testFolders)
                    .then(() => {
                        return db
                            .into('noteful_notes')
                            .insert(maliciousNote)
                    });
            });

            it('removes XSS attack content', () => {
                return supertest(app)
                    .get('/api/notes')
                    .expect(200)
                    .expect(res => {
                        expect(res.body[0].content).to.eql(sanitizedNote.content)
                    })
            });
        });
    });

    describe('GET /api/notes/:note_id', () => {
        context('given no notes in the database', () => {
            it('responds with 404 and an error message', () => {
                const noteId = 12345;
                return supertest(app)
                    .get(`/api/notes/${noteId}`)
                    .expect(404, { error: { message: `Note doesn't exist` }})    
            })

        })
        
        context('given there are notes in the database', () => {

            beforeEach('insert folders & notes', () => {
                return db
                    .into('noteful_folders')
                    .insert(testFolders)
                    .then(() => {
                        return db
                            .into('noteful_notes')
                            .insert(testNotes)
                    });
            });

            it('responds with a 200 and the specified note', () => {
                const noteId = 2;
                const expectedNote = testNotes[noteId - 1];

                return supertest(app)
                    .get(`/api/notes/${noteId}`)
                    .expect(200, expectedNote)
            });
        });
        
        context('given an XSS attack', () => {
            
            beforeEach('insert folders', () => {
                return db
                    .into('noteful_folders')
                    .insert(testFolders)
                    .then(() => {
                        return db
                            .into('noteful_notes')
                            .insert(maliciousNote)
                    })
            });
        
            it('removes XSS attack content', () => {
                return supertest(app)
                    .get(`/api/notes/${maliciousNote.id}`)
                    .expect(200)
                    .expect(res => {
                        expect(res.body.content).to.eql(sanitizedNote.content)
                    })
            });
        
        });
    
    });

    describe(`POST /api/notes`, () => {
        
        before('insert folders', () => {
            return db
                .into('noteful_folders')
                .insert(testFolders)
        });
        
        it('creates a note, responding with 201 and the new note', () => {
            
            return supertest(app)
                .post('/api/notes')
                .send(newNote)
                .expect(201)
                .expect(res => {
                    expect(res.body.name).to.eql(newNote.name)
                    expect(res.body.content).to.eql(newNote.content)
                    expect(res.body.folderid).to.eql(newNote.folderid)
                    expect(res.body).to.have.property('id')
                    expect(res.headers.location).to.eql(`/api/notes/${res.body.id}`)
                });
        });

        const requiredFields = ['name', 'content', 'folderid'];

        requiredFields.forEach(field => {
            
            const testNote = {
                name: "Test note",
                content: "Test content",
                folderid: 1
            };

            it(`responds with 400 and an error message when the '${field}' is missing`, () => {
                delete testNote[field];

                return supertest(app)
                    .post(`/api/notes`)
                    .send(testNote)
                    .expect(400, { 
                        error: { message: `Missing ${field} in request body`}
                    });
            });
        });

        context('Given an XSS attack', () => {
            before('insert folders', () => {
                return db
                    .into('noteful_folders')
                    .insert(testFolders)
            });

            it('removes XSS content', () => {
                
                return supertest(app)
                    .post('/api/notes')
                    .send(maliciousNote)
                    .expect(201)
                    .expect(res =>{
                        expect(res.body.content).to.eql(sanitizedNote.content)
                    });
            });
        });
    });
    
    describe(`DELETE /api/notes/:note_id`, () => {
        context('Given no notes', () => {
            it('responds with a 404', () => {
                const noteId = 12345;

                return supertest(app)
                    .delete(`/api/notes/${noteId}`)
                    .expect(404, { 
                        error: { message: `Note doesn't exist` }
                    });
            });
        });

        context('Given then are notes in the database', () => {
            beforeEach('insert folders & notes', () => {
                return db
                    .into('noteful_folders')
                    .insert(testFolders)
                    .then(() => {
                        return db
                            .into('noteful_notes')
                            .insert(testNotes)
                    });
            });

            it('responds with a 204 and deletes the note', () => {
                const idToRemove = 2;
                const expectedNotesArray = testNotes.filter(note => note.id !== idToRemove);

                return supertest(app)
                    .delete(`/api/notes/${idToRemove}`)
                    .expect(204)
                    .then(res => 
                        supertest(app)
                            .get(`/api/notes`)
                            .expect(expectedNotesArray)
                        );
            });
        });
    });

    describe(`PATCH /api/notes/:note_id`, () => {
        
        context('given there are no notes', () => {
            
            it('responds with a 404', () => {
                const noteId = 12345;

                return supertest(app)
                    .patch(`/api/notes/${noteId}`)
                    .expect(404, { 
                        error: { message: `Note doesn't exist` }
                    });
            });
        });

        context('given there are notes in the database', () => {
            
            beforeEach('insert notes & folders', () => {
                return db
                    .into('noteful_folders')
                    .insert(testFolders)
                    .then(() => {
                        return db
                            .into('noteful_notes')
                            .insert(testNotes)
                    });
            });

            it('responds with a 204 and updates the note', () => {
                const idToUpdate = 2;
                const updatedNote = {
                    name: "updated note name",
                    content:"updated folder content",
                    folderid: 1
                };

                const returnedNote = {
                    ...testNotes[idToUpdate - 1],
                    ...updatedNote
                }

                return supertest(app)
                    .patch(`/api/notes/${idToUpdate}`)
                    .send(updatedNote)
                    .expect(204)
                    .then(res => 
                        supertest(app)
                            .get(`/api/notes/${idToUpdate}`)
                            .expect(returnedNote)
                    );
            });

            it('responds with 400 when no required fields supplied', () => {
                const idToUpdate = 2;

                return supertest(app)
                    .patch(`/api/notes/${idToUpdate}`)
                    .send({ irrelevantField: "foo" })
                    .expect(400, { 
                        error: { message: `Request body must contain 'name', 'content', or 'folderid'` }
                    });
            });

            it(`responds with a 204 when only updating a subset of fields`, () => {
                const idToUpdate = 2;
                
                const updateNote = {
                    name: "updated note"
                };

                const expectedNote = {
                    ...testNotes[idToUpdate - 1],
                    ...updateNote
                };

                return supertest(app)
                    .patch(`/api/notes/${idToUpdate}`)
                    .send(expectedNote)
                    .expect(204)
                    .then(res =>
                        supertest(app)
                            .get(`/api/notes/${idToUpdate}`)
                            .expect(expectedNote)
                    );
            });
        });
    });
});