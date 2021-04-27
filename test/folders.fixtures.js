function makeFoldersArray(){
    
    const testFolders = [
        {
          "name": "Important"
        },
        {
          "name": "Super"
        },
        {
          "name": "Spangley"
        }
      ]
    
    
    const expectedFolders = 

    [
        {
            "id":1,
            "name": "Important"
        },
        {
            "id":2,
            "name": "Super"
        },
        {
            "id":3,
            "name": "Spangley"
        }
      ];


      return {
          testFolders,
          expectedFolders
      }


}

function makeMaliciousFolders(){

  const maliciousFolder = {
    id:911,
    name: 'Naughty naughty very naughty <script>alert("xss");</script>'
  }

  const cleanFolder = {
    
    id:911,
    name: 'Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;'
  }

  return {
    maliciousFolder,
    cleanFolder
  }

}

module.exports = {
    makeFoldersArray,
    makeMaliciousFolders
}