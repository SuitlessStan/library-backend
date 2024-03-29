import errors from "../utils/errors.js"
import Util from "../utils/index.js"
import Ajv from "ajv"
import moment from "moment-timezone"
import ajvFormats from "ajv-formats"

const tableName = "books"

class Book {
  constructor(params) {
    this.knex = params.knex
  }
  /**
   * get a single book object
   * @param {String} id of a book
   * @returns {Promise<Object>} book object
   */
  getById(id) {
    let raw = this.knex.select().from(tableName).where({ id: id }).toSQL()
    return this.knex.raw(raw.sql, raw.bindings).then((result) => {
      if (result[0].length > 1) {
        let e = new Error(errors.GET_BOOK_BY_ID)
        e.statusCode = 400
        throw e
      }
      return result[0][0]
    })
  }

  /**
   * get a list of all books by author
   * @param {Object} params to search by author name
   *    - {string} fbUserId - firebase user id
   *    - {string} author - name of the author
   * @returns {Promise<Array<Object>>} list of books
   */
  // getByAuthor(params) {
  //   let ajv = ajvFormats(
  //     new Ajv({ removeAdditionalFields: true, allowUnionTypes: true })
  //   )
  //   let _params = Object.assign({}, params)
  //   const _validate = ajv.compile(BookSchema.byAuthor)
  //   let isValid = _validate(_params)

  //   if (!isValid) {
  //     let e = new Error(errors.BY_AUTHOR_VALIDATION_ERROR)
  //     e.statusCode = 400
  //     e.info = _validate.error

  //     return Promise.reject(e)
  //   }

  //   const { fbUserId, author } = params

  //   params.limit = params.limit ? params.limit : 10
  //   params.offset = params.offset ? params.offset : 0

  //   let raw = this.knex
  //     .select()
  //     .from(tableName)
  //     .where({ fbUserId: fbUserId, author: author })
  //     .limit(params.limit)
  //     .offset(params.offset)
  //     .toSQL()
  //   return this.knex.raw(raw.sql, raw.bindings).then((result) => {
  //     return result[0]
  //   })
  // }

  /**
   * get a list of all books for specific user
   * @param {Object} params
   *  - {string} fbUserId - firebase user id
   * @returns {Promise<Array<Object>>} list of book objects
   */
  get(params) {
    const { fbUserId } = params

    params.limit = params.limit ? params.limit : 10
    params.offset = params.offset ? params.offset : 0

    if (!fbUserId) {
      let e = new Error(errors.MISSING_QUERY_PARAMS)
      e.statusCode = 400
      throw e
    }

    let raw = this.knex
      .select()
      .from(tableName)
      .where({ fbUserId: fbUserId })
      .whereNull("inactiveAt")
      .limit(params.limit)
      .offset(params.offset)
      .toSQL()
    return this.knex.raw(raw.sql, raw.bindings).then((result) => {
      return result[0]
    })
  }

  /**
    Create a new book record in the database with the provided data.
    @param {Object} book - The book data to be stored.
    @returns {Promise<Object>} - A promise that resolves with the inserted book data including its ID, or rejects with an error object.
    @throws {Error} - If book data fails validation or book already exists in the database or book metadata is not found.
    */
  post(book = {}) {
    let ajv = ajvFormats(
      new Ajv({ removeAdditionalFields: true, allowUnionTypes: true })
    )
    let _book = { ...book }
    const _validate = ajv.compile(BookSchema.post)
    let isValid = _validate(_book)

    if (!isValid) {
      let e = new Error(errors.BOOK_POST_VALIDATION_ERROR)
      e.statusCode = 400
      e.info = _validate.errors

      return Promise.reject(e)
    }

    // check if book in parameter exists
    const { fbUserId, title } = _book

    let raw = this.knex
      .select()
      .from(tableName)
      .where({ title: title, fbUserId: fbUserId })
      .toSQL()
    return this.knex.raw(raw.sql, raw.bindings).then(async (result) => {
      if (result[0].length > 1) {
        let e = new Error(errors.BOOK_ALREADY_EXISTS)
        e.statusCode = 400
        throw e
      }

      // if inserted book is not finished
      _book.finished = _book.current_page === book.total_pages

      if (_book.cover_url) {
        _book.cover_url = JSON.stringify(_book.cover_url)
      }

      if (typeof _book.cover_url == null) {
        delete _book.cover_url
        delete _book.author
      }

      try {
        raw = this.knex
          .from(tableName)
          .where({ title: title, fbUserId: fbUserId })
          .insert({
            ..._book,
            createAt: moment().utc().format("YYYY-MM-DD HH:mm:ss"),
          })
          .toSQL()
        return this.knex.raw(raw.sql, raw.bindings).then((result) => {
          if (_book.cover_url) {
            _book.cover_url = JSON.parse(_book.cover_url)
          }
          // // don't show fbUserId in post results
          delete _book.fbUserId

          return Object.assign({}, _book, { id: result[0].insertId })
        })
      } catch (err) {
        let e = new Error(errors.BOOK_INFO_NOT_FOUND)
        e.statusCode = 400
        throw e
      }
    })
  }

  /**
   * patch book object
   * @param {Object} params to update book object
   * @returns returns updated book object
   * @throws {Error} - If book data fails validation or book already exists in the database or book metadata is not found.
   */
  patch(params) {
    let ajv = ajvFormats(new Ajv({ removeAdditionalFields: true, allowUnionTypes: true }))
    let _book = Object.assign({}, params)
    const _validate = ajv.compile(BookSchema.patch)
    let isValid = _validate(_book)

    if (!isValid) {
      let e = new Error(errors.BOOK_PATCH_VALIDATION_ERROR)
      e.statusCode = 400
      e.info = _validate.error

      return Promise.reject(e)
    }

    const { fbUserId, title } = _book

    let raw = this.knex
      .select()
      .from(tableName)
      .where({ fbUserId: fbUserId, title: title })
      .whereNull("inactiveAt")
      .toSQL()
    return this.knex.raw(raw.sql, raw.bindings).then((result) => {
      if (!result[0].length) {
        let e = new Error(errors.BOOK_INFO_NOT_FOUND)
        e.statusCode = 400
        throw e
      }

      if (result[0].length > 1) {
        // TODO: find a general name for this error
        let e = new Error(errors.BOOK_PATCH_VALIDATION_ERROR)
        e.statusCode = 400
        throw e
      }

      // if inserted book is not finished
      if (_book.current_page) {
        const { total_pages } = result[0][0]

        if (_book.current_page == total_pages) {
          _book.finished = true
        }
      }

      raw = this.knex
        .from(tableName)
        .where({ fbUserId: fbUserId, title: title })
        .update({
          ..._book,
          updatedAt: moment().utc().format("YYYY-MM-DD HH:mm:ss"),
        })
        .toSQL()
      return this.knex.raw(raw.sql, raw.bindings).then((result) => {
        return Object.assign({}, _book)
      })
    })
  }

  /**
   * soft delete book object for user
   * @param {String} title of book
   * @param {String} fbUserId of user
   * @returns soft delete book object from database
   */
  delete(params) {
    const { fbUserId, title } = params

    let ajv = ajvFormats(new Ajv({ removeAdditionalFields: true, allowUnionTypes: true }))
    const _validate = ajv.compile(BookSchema.delete)
    let isValid = _validate({ fbUserId, title })

    if (!isValid) {
      let e = new Error(errors.BOOK_DELETION_VALIDATION_ERROR)
      e.statusCode = 400
      e.info = _validate.error

      return Promise.reject(e)
    }

    let raw = this.knex
      .from(tableName)
      .where({ title: title, fbUserId: fbUserId })
      .update({ inactiveAt: moment().utc().format("YYYY-MM-DD HH:mm:ss") })
      .toSQL()
    return this.knex.raw(raw.sql, raw.bindings).then((result) => {
      return result[0]
    })
  }

  /**
   * hard delete book object from database (not exposed to the user)
   * @param {String} id of a book object
   * @returns success or failure of deletion of a book object
   */
  hardDelete(id) {
    let raw = this.knex.from(tableName).where({ id: id }).del().toSQL()
    return this.knex.raw(raw.sql, raw.bindings).then((result) => {
      return result[0]
    })
  }
}

const BookSchema = {
  get properties() {
    return {
      id: { type: ["integer", "string"] },
      createAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
      inactiveAt: { type: "string", format: "date-time" },
      fbUserId: { type: "string", maxLength: 128 },
      title: { type: "string" },
      current_page: { type: "integer" },
      total_pages: { type: "integer" },
      author: { type: "string" },
      review: { type: "string" },
      finished: { type: "boolean" },
    }
  },

  get post() {
    return {
      $id: "/Book.post",
      type: "object",
      properties: Util.pick(
        BookSchema.properties,
        "current_page",
        "total_pages",
        "fbUserId",
        "title",
        "url",
        "authorName"
      ),
      required: ["fbUserId", "title", "total_pages", "current_page"],
    }
  },

  get patch() {
    return {
      $id: "/Book.patch",
      type: "object",
      properties: Util.pick(
        BookSchema.properties,
        "current_page",
        "total_pages",
        "fbUserId",
        "title",
        "review",
        "finished"
      ),
      required: ["fbUserId", "title"],
    }
  },

  get delete() {
    return {
      $id: "/Book.delete",
      type: "object",
      properties: Util.pick(BookSchema.properties, "fbUserId", "title"),
      required: ["fbUserId", "title"],
    }
  }
}

export { Book, BookSchema }
