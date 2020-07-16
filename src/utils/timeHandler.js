const getCurrentTime = async () => {
    var MyDate = new Date();
    var MyDateString;

    MyDateString = MyDate.getFullYear() + '-' + ('0' + (MyDate.getMonth()+1)).slice(-2) + '-' + ('0' + MyDate.getDate()).slice(-2);
    var time = ('0' + MyDate.getHours()).slice(-2)+ ":" + ('0' + MyDate.getMinutes()).slice(-2) + ":" + ('0' + MyDate.getSeconds()).slice(-2);
    var dateTime = MyDateString + 'T' + time + '.000Z';

    return dateTime
}


module.exports = { getCurrentTime }
