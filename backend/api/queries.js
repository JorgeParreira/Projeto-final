module.exports = {
    categoryWithChildren:`
        WITH RECURSIVE subcategories (id) As (
            SELECT id FROM categories WHERE id = ?
            UNION ALL 
            SELECT c.id FROM subcategories, categories c
                WHERE "parentId" = subcategories.id
        )
        SELECT id FROM subcategories
    `

}