const express = require('express');
const NotesService = require('./notes-service');
const xss = require('xss');
const { default: knex } = require('knex');

const notesRouter = express.Router();
const jsonParser = express.json();

const serializeNote = note => ({
    id: note.id,
    name: note.name,
    modified: note.modified,
    content: xss(note.content),
    folderid: note.folderid
})

notesRouter
    .route('/')
    .get((req, res, next) => {
        const knexInstance = req.app.get('db')
        NotesService.getAllNotes(knexInstance)
            .then(notes => {
                res.json(notes.map(serializeNote))
            })
            .catch(next);
    })
    .post(jsonParser, (req, res, next) => {
        const knexInstance = req.app.get('db');
        const { name, content, folderid } = req.body;
        const newNote = { name, content, folderid }

        for(const [key,value] of Object.entries(newNote)){
            if (value == null){
                return res.status(400).json({
                    error: { message: `Missing ${key} in request body`}
                })
            };
        };

        NotesService.insertNotes(knexInstance, newNote)
            .then(note => {
                res
                    .status(201)
                    .location(`/notes/${note.id}`)
                    .json(serializeNote(note))
            })
            .catch(next)
    })

notesRouter
    .route(`/:note_id`)
    .all((req, res, next) => {
        const knexInstance = req.app.get('db');
        const id = req.params.note_id

        NotesService.getById(knexInstance, id)
            .then(note => {
                if(!note) {
                    return res.status(404).json({
                        error: { message: `Note doesn't exist` }
                    })
                }
                res.note = note;
                next()
            })
            .catch(next)
    })
    .get((req, res, next) => {
        res.json(serializeNote(res.note))
    })
    .delete((req, res, next) => {
        const knexInstance = req.app.get('db')
        NotesService.deleteNote(knexInstance, req.params.note_id)
            .then(numRowsAffected => {
                res.status(204).end()
            })
            .catch(next)
    })

module.exports = notesRouter;