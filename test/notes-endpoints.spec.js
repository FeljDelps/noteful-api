const { expect } = require('chai');
const knex = require('knex');
const app = require('../src/app');
const supertest = require('supertest');
const { makeNotesArray, makeFoldersArray, makeNewNote, makeMaliciousNote, makeSanitizedNote } = require('./notes.fixtures');

describe.only('Notes endpoints', function(){

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

    describe(`GET /notes`, () => {
        context('given there are no notes', () => {
            it('responds with 200 and an empty list', () => {
                return supertest(app)
                    .get('/notes')
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
                    .get('/notes')
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
                    .get('/notes')
                    .expect(200)
                    .expect(res => {
                        expect(res.body[0].content).to.eql(sanitizedNote.content)
                    })
            })
        })
    });

    describe('GET /notes/:note_id', () => {
        context('given no notes in the database', () => {
            it('responds with 404 and an error message', () => {
                const noteId = 12345;
                return supertest(app)
                    .get(`/notes/${noteId}`)
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
                    .get(`/notes/${noteId}`)
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
                    .get(`/notes/${maliciousNote.id}`)
                    .expect(200)
                    .expect(res => {
                        expect(res.body.content).to.eql(sanitizedNote.content)
                    })
            })
        
        });
    
    });

    describe(`POST /notes`, () => {
        
        before('insert folders', () => {
            return db
                .into('noteful_folders')
                .insert(testFolders)
        });
        
        it('creates a note, responding with 201 and the new note', () => {
            
            return supertest(app)
                .post('/notes')
                .send(newNote)
                .expect(201)
                .expect(res => {
                    expect(res.body.name).to.eql(newNote.name)
                    expect(res.body.content).to.eql(newNote.content)
                    expect(res.body.folderid).to.eql(newNote.folderid)
                    expect(res.body).to.have.property('id')
                    expect(res.headers.location).to.eql(`/notes/${res.body.id}`)
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
                    .post(`/notes`)
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
                
                const badNote = {
                    name:'Malicious note name',
                    content: `Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`,
                    folderid:1
                };

                return supertest(app)
                    .post('/notes')
                    .send(badNote)
                    .expect(201)
            });
        });
    });
    
    describe(`DELETE /notes/:note_id`, () => {
        context('Given no notes', () => {
            it('responds with a 404', () => {
                const noteId = 12345;

                return supertest(app)
                    .delete(`/notes/${noteId}`)
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
                    .delete(`/notes/${idToRemove}`)
                    .expect(204)
                    .then(res => 
                        supertest(app)
                            .get(`/notes`)
                            .expect(expectedNotesArray)
                        );
            });
        });
    });
});