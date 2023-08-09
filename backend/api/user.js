const bcrypt = require('bcrypt-nodejs')
const { where } = require('../config/db')


module.exports = app => {
    const { existsOrError, notExistsOrError, equalsOrError } = app.api.validation

    const encryptPassword = password => {
        const salt = bcrypt.genSaltSync(10)
        return bcrypt.hashSync(password, salt)
    }

    //Método para inserir e alterar um utilizador na bd

    const save = async (req, res) => {
        const user = { ...req.body }
        if(req.params.id) user.id = req.params.id

        if(!req.originalUrl.startsWith('/users')) user.admin = false
        if(!req.user || !req.user.admin) user.admin = false

        try {
            existsOrError(user.name, 'O campo nome não foi preenchido')
            existsOrError(user.email, 'O campo e-mail não foi preenchido')
            existsOrError(user.password, 'O campo password não foi preenchido')
            existsOrError(user.confirmPassword, 'Confirmação de password inválida')
            equalsOrError(user.password, user.confirmPassword, 'Passwords não conferem')
            const userFromBD = await app.db('users')
                .where({ email: user.email }).first()

            if(!user.id) {
                notExistsOrError(userFromBD, 'Este utilizador já existe')
            }
        }catch(msg) {
            return res.status(400).send(msg)
        }

        user.password = encryptPassword(user.password)
        delete user.confirmPassword

        if(user.id) {
            app.db('users')
                .update(user)
                .where({ id: user.id })
                .whereNull('deletedAt')
                .then(_ => res.status(204).send())
                .catch(err => res.status(500).send(err))
        } else {
            app.db('users')
                .insert(user)
                .then(_ => res.status(204).send())
                .catch(err => res.status(500).send(err))
        }
    }

    const limit = 10

    const get = async (req, res) => {
        const page = req.query.page || 1

        const result = await app.db('users').count('id').first()
        const count = parseInt(result.count)

        app.db('users')
            .select('id', 'name', 'email', 'email', 'admin')
            .whereNull('deletedAt')
            .limit(limit).offset(page * limit - limit)
            .then(users => res.json({data: users, count, limit}))
            .catch(err => res.status(500).send(err))
    }

    const getById = (req, res) => {
        const id = req.params.id

        app.db('users')
            .select('id', 'name', 'email', 'email', 'admin')
            .where({ id: id })
            .whereNull('deletedAt')
            .first()
            .then( user => {
                if(user) {
                    res.json(user)
                } else {
                    res.status(404).send('Utilizador não encontrado')
                }
            })
            .catch(err => res.status(500).send(err))
    }

    const remove = async (req, res) => {
        try {
            const articles = await app.db('articles')
                .where({ userId: req.params.id })
            notExistsOrError(articles, 'Usuário possui artigos.')

            const rowsUpdated = await app.db('users')
                .update({deletedAt: new Date()})
                .where({ id: req.params.id })
            existsOrError(rowsUpdated, 'Usuário não foi encontrado.')

            res.status(204).send()
        } catch(msg) {
            res.status(400).send(msg)
        }
    }


    return { save, get, getById, remove }
}