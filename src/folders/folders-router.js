const path = require('path');
const express = require('express');
const xss = require('xss');
const FoldersService = require('./folders-service');


const foldersRouter = express.Router();
const jsonParser = express.json();

const serializeFolder = folder => ({
    id: folder.id,
    name: xss(folder.name)
})

foldersRouter
    .route('/')
    .get((req, res, next) => {
        const knexInstance = req.app.get('db')
        FoldersService.getAllFolders(knexInstance)
            .then(folders => {
                res.json(folders)
            })
            .catch(next);
    })
    .post(jsonParser, (req, res, next) => {
        const  { name } = req.body;
        const newFolder = { name };
    
        if(!name) {
            return res.status(400).json({
                error: { message: `Missing 'name' in request body`}
            });
        };
        
        FoldersService.insertFolder(req.app.get('db'), newFolder)
            .then(folder => {
                res
                    .status(201)
                    .location(path.posix.join(req.originalUrl, `/${folder.id}`))
                    .json(folder)
            })
            .catch(next)            
    })

foldersRouter
    .route('/:folder_id')
    .all((req, res, next) => {
        FoldersService.getById(req.app.get('db'), req.params.folder_id)
            .then(folder => {
                if(!folder){
                    return res.status(404).json({
                        error: { message: `Folder doesn't exist` }
                    })
                }
                res.folder = folder
                next()
            })
            .catch(next)
    })
    .get((req, res, next) => {
        res.json(serializeFolder(res.folder))       
    })
    .delete((req, res, next) => {
        FoldersService.deleteFolder(req.app.get('db'), req.params.folder_id)
            .then(numRowsAffected => {
                res.status(204).end()
            })
            .catch(next)
    })
    .patch(jsonParser, (req, res, next) => {
        const knexInstance = req.app.get('db')
        const id = req.params.folder_id;
        const { name } = req.body;
        const updatedFields = { name };
 
        const numOfValues = Object.values(updatedFields).filter(Boolean).length
            if(numOfValues === 0) {
                return res.status(400).json({
                    error: { message: `Request body must contain 'name'` }
                })
            }
        
        FoldersService.updateFolder(knexInstance, id, updatedFields)
            .then(numRowsAffected => {
                res.status(204).end()
            })
            .catch(next)

    })
        

    module.exports = foldersRouter;