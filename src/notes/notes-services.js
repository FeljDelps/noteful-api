const NotesService = {
    getAllNotes(knex){
        return knex.select('*').from('noteful_notes')
    },

    insertNotes(knex, newNote){
        return knex
            .into('noteful_notes')
            .insert(newNote)
            .returning('*')
            .then(rows => {
                return rows[0]
            });
    },
    getById(knex,id){
        return knex
            .from('noteful_notes')
            .select('*')
            .where('id', id)
            .first();
    },
    deleteNote(knex,id){
        return knex
            .from('noteful_notes')
            .where({ id })
            .delete();
    },
    updateNote(knex, id, newData){
        return knex
            .into('noteful_notes')
            .where({ id })
            .update(newData)
    }

}

 module.exports = NotesService;