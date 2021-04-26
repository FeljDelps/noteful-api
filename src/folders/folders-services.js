const { default: knex } = require("knex");

const FoldersService = {
    getAllFolders(knex) {
        return knex.select('*').from('noteful_folders')
    },

    insertFolder(knex, newFolder){
        return knex
            .into('noteful_folders')
            .insert(newFolder)
            .returning('*')
            .then(rows => {
                return rows[0]
            });
    },
    getById(knex, id){
        return knex
            .from('noteful_folders')
            .select('*')
            .where('id',id)
            .first();
    },
    deleteFolder(knex, id){
        return knex
            .from('noteful_folders')
            .where({ id })
            .delete();
    },
    updateFolder(knex, id, newData){
        return knex
            .into('noteful_folders')
            .where({ id })
            .update(newData)
    }
};

module.exports = FoldersService;