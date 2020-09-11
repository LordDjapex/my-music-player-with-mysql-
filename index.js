require('dotenv').config()

const express = require('express')
const app = express()
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const mysql = require('mysql')
const multer = require('multer')
const dateFormat = require('dateformat');
const saltRounds = 10;


const port = process.env.PORT || 3000;

/*
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1/spotify', { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true })
    .then(() => {
        console.log('Mongoose successfully connected')
    }).catch(() => {
        console.log('Mongoose connection failed')
    });

    const albumModel = mongoose.model('albums', new mongoose.Schema({
    name: {type: String, required: true, unique: true},
    password: {type: String, required: true},
}))
*/

app.set('views', __dirname + '/views');
app.use(express.static('uploads'));
app.use(express.static('public'))
app.use(express.static('songs'));
app.use(express.json())
app.use(cookieParser())
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }))
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'ejs');
let lastinserted = 55;


const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, './uploads/')
    },
    filename: (req, file, callback) => {
        callback(null, Date.now() + file.originalname)
    }
})

const storageSongs = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, './songs/')
    },
    filename: (req, file, callback) => {
        callback(null, Date.now() + file.originalname)
    }
})



const upload = multer({storage: storage})
const uploadsong = multer({storage: storageSongs})

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'spotify'
})

db.connect((err) => {
    if (err) throw err
    console.log('connected to spotify databse')
})

app.get('/', (req, res) => {
    albumShow(lastinserted, req, res)
})

app.get('/album/:albumid', (req, res) => {
    albumShow(req.params.albumid, req, res)
})
    

app.get('/upload', (req, res) => {
    res.render('upload')
})


app.get('/albumSearch', (req, res) => {
    const songquery = "select * from songs where name_song = ?"
    let songs = []
    let albums = []
    const sqlquery = "select * from albums where name_album = ?"
    db.query(sqlquery, req.query.searchvalue, (err, result, fields) => {
        if (err) throw err
        for (let i = 0; i < result.length; i++) {
            const objecttoadd = Object.assign({}, result[i])
            setTimeout(() => {
                db.query('select * from artists where idartists = ?', objecttoadd.artist_album, (err, result, fields) => {
                    if (err) throw err
                    const resultobject = Object.assign({}, result[0])
                    console.log(resultobject)
                    objecttoadd.artist_album = resultobject.artist_name
                    albums.push(objecttoadd)
                    console.log(albums)
                })
            }, 50)
            
        }
    })
    db.query(songquery, req.query.searchvalue, (err, result, fields) => {
        if (err) throw err
        for (let i = 0; i < result.length; i++) {
            const objecttoadd = Object.assign({}, result[i])
            setTimeout(() => {
                db.query('select * from artists where idartists = ?', objecttoadd.song_artist, (err, result, fields) => {
                    if (err) throw err
                    const resultobject = Object.assign({}, result[0])
                    console.log(resultobject)
                    objecttoadd.song_artist = resultobject.artist_name
                    songs.push(objecttoadd)
                console.log(songs)
                })
            }, 50)
            
        }
    })

    setTimeout(() => {
        res.render('search', {songs: songs, albums: albums})
    }, 200)

})

app.listen(port, () => {
    console.log('Listening on port ' + port)
})

app.post('/uploadSong', uploadsong.single('song'), (req, res) => {
    console.log('upload song')
    let queryResults = null;
    db.query("Select * from artists where artist_name = ?", req.body.nameoftheartist, (err, result, fields) => {
        if (err) throw err;
            queryResults = result     
            console.log(result)
    })

    setTimeout(() => {
        const object = Object.assign({}, queryResults[0])
        const sqlquery = "insert into songs (name_song, song_path_reference, song_album, song_artist) values (?, ?, ?, ?)"
        const data = [req.body.songname, req.file.filename, lastinserted, object.idartists]
        db.query(sqlquery, data, (err, result) => {
            if (err) throw err;
            console.log("Number of records inserted: " + result.affectedRows);
            console.log(result)
        })
        setTimeout(() => {
            res.send("<script>window.close();</script>")
        }, 300)
    }, 200)

    
})

app.post('/uploadCover', upload.single('avatar'), (req, res) => {
    let truth = false;
    let queryResults = null;
    db.query("Select * from artists where artist_name = ?", req.body.artistName, (err, result, fields) => {
        if (err) throw err;
            queryResults = result     
            console.log(result)

    })


    setTimeout(() => {
        const object = Object.assign({}, queryResults[0])
        if (object.idartists != undefined) {
            query();
        } else {
            db.query("insert into artists (artist_name) values (?)", req.body.artistName, (err, result, fields) => {
                if (err) throw err;
                queryResults = result 
                console.log()
                truth = true;
                console.log('inserted into artiss')
                query()
            })
            
        }
    }, 200)
    

    function query() {

        let toBeQueried
        if (truth) {
            toBeQueried = queryResults.insertId
        } else {
            const object = Object.assign({}, queryResults[0])
            toBeQueried =  object.idartists
        }

        const sqlquery = "insert into albums (name_album, cover_album_reference, artist_album, release_album) values (?, ?, ?, ?)"
        const data = [req.body.albumName, req.file.filename, toBeQueried, dateFormat(new Date(), "yyyy-mm-dd h:MM:ss")]
        db.query(sqlquery, data, (err, result) => {
        if (err) throw err;
        console.log("Number of records inserted: " + result.affectedRows);
        lastinserted = result.insertId
        console.log(lastinserted)
        
        
        setTimeout(() => {
            res.send("<script>window.close();</script>")
        })
        }, 300)

        
    }
    /*
    
    */
})



function albumShow(albumNeeded, req, res) {
    let object = null;
    let artist = null;
    let songs = null
    
    db.query('Select * from albums where id_album = ?', albumNeeded, (err, result, fields) => {
        if (err) throw err
        object = Object.assign({}, result[0])
        console.log(object)
    })

    db.query('select * from songs where song_album = ?', albumNeeded, (err, result, fields) => {
        if (err) throw err
        songs = result
    })
    
    setTimeout(() => {
        db.query("Select * from artists where idartists = ?", object.artist_album, (err, result, fields) => {
            if (err) throw err;
            artist = Object.assign({}, result[0])    
            console.log(artist)
        })
        const songsarray = []
        for (let i = 0; i < songs.length; i++) {
            const objecttoadd = Object.assign({}, songs[i])
            songsarray.push(objecttoadd)
        }
        console.log(songsarray)
        setTimeout(() => {
            if (albumNeeded === lastinserted) {
                res.render('index', {name_album: object.name_album, cover_album: object.cover_album_reference, release_date: object.release_album, artist_album: artist.artist_name, 
                    songs: songsarray})
            } else {
                res.render('album', {name_album: object.name_album, cover_album: object.cover_album_reference, release_date: object.release_album, artist_album: artist.artist_name, 
                    songs: songsarray})
            }
        }, 200)
        }, 200)
}