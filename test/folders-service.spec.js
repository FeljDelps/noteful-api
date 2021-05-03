const FoldersService = require('../src/folders/folders-service');
const knex = require('knex');
const { makeFoldersArray } = require('../test/folders.fixtures');
const { expect } = require("chai");

describe(`Folders service object`, function(){
    let db

    const { testFolders, expectedFolders } = makeFoldersArray();

    before(() => {
        db = knex({
            client:'pg',
            connection: process.env.TEST_DATABASE_URL
        });
    });

    before(() => db.raw('TRUNCATE noteful_folders, noteful_notes RESTART IDENTITY CASCADE'));

    afterEach(() => db.raw(`TRUNCATE noteful_folders, noteful_notes RESTART IDENTITY CASCADE`));

    after(() => db.destroy());

    context(`Given 'noteful_folders has data`, () => {
            
        beforeEach(() => {
            return db
                .into('noteful_folders')
                .insert(testFolders)
            });
            
            it(`getAllFolders() resolves all folders from the 'noteful_folders' table`, () => {
                return FoldersService.getAllFolders(db)
                    .then(actual => {
                        expect(actual).to.eql(expectedFolders)
                    });
            });
        
           it(`getById() resolves a folder by 'id' from 'noteful_folders' table`, () => {
               const thirdId = 3;
               const thirdTestFolder = testFolders[thirdId-1];

               return FoldersService.getById(db, thirdId)
                .then(actual => {
                    expect(actual).to.eql({
                        id: thirdId,
                        name: thirdTestFolder.name
                    });
                });
           });

           it(`deleteFolder()removes a folder by id from 'noteful_folders' table`, () => {
               const folderId = 3;

               return FoldersService.deleteFolder(db, folderId)
                .then(() => FoldersService.getAllFolders(db))
                .then(allFolders => {
                    const expected = expectedFolders.filter(folder => folder.id !== folderId)
                    expect(allFolders).to.eql(expected)
                });  
           });

           it(`updateFolder() updates a folder from the 'blogful_folders table`, () => {
               const idOfFolderToUpdate = 3;
               const newFolderData = {
                   name:"updated folder"
               }

               return FoldersService.updateFolder(db, idOfFolderToUpdate, newFolderData)
                .then(() => FoldersService.getById(db, idOfFolderToUpdate))
                .then(folder => {
                    expect(folder).to.eql({
                        id: idOfFolderToUpdate,
                        ...newFolderData
                    });
                });
           });

        });
        
    context(`Given 'noteful_folders has no data`, () => {
        it(`getAllFolders() resolves an empty array`, () => {
            return FoldersService.getAllFolders(db)
                .then(actual => {
                    expect(actual).to.eql([])
                });
       });

        it(`insertFolder() inserts a folder and resolves the folder with an 'id'`, () => {
            const newFolder = {
                name: "New folder"
            };

            return FoldersService.insertFolder(db, newFolder)
                .then(actual => {
                    expect(actual).to.eql({
                        id:1,
                        name: "New folder"
                    });
                });
            });
        });
});