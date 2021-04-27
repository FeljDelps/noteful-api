const NotesService = require('../src/notes/notes-services');
const knex = require('knex');
const { makeNotesArray } = require('../test/notes.fixtures');
const { makeFoldersArray } = require('../test/folders.fixtures');
const { expect } = require('chai');

describe.skip('Notes service object', function(){
    let db

    const { testNotes } = makeNotesArray();
    const { testFolders, expectedFolders } = makeFoldersArray;

    before('make knex instance',() => {
        db = knex({
            client:'pg',
            connection: process.env.TEST_DB_URL
        });
    });

    before('clear the tables', () => db.raw('TRUNCATE noteful_folders, noteful_notes RESTART IDENTITY CASCADE'));

    afterEach('cleanup', () => db.raw('TRUNCATE noteful_folders, noteful_notes RESTART IDENTITY CASCADE'));

    after('disconnect from db',() => db.destroy());

    context(`Given noteful_notes has data`, () => {

        beforeEach(() => {
            return db
                .into('noteful_folders')
                .insert(testFolders)
                .then(() => {
                    return db
                        .into('noteful_notes')
                        .insert(testNotes)
                });
        });

        it(`getAllNotes() resolves all notes from 'noteful_notes' table`, () => {
            return NotesService.getAllNotes(db)
                .then(actual => {
                    expect(actual).to.eql(testNotes)
                });
        });
    });

})