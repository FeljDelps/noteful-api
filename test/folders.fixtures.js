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

module.exports = {
    makeFoldersArray
}