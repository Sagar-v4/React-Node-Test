const MeetingHistory = require('../../model/schema/meeting')

const add = async (req, res) => {
    try {
        const meetingHistory = new MeetingHistory(req.body);
        await meetingHistory.save();
        res.status(200).json(meetingHistory);
    } catch (err) {
        res.status(400).json({ message: "Failed to create meeting", err })
    }
   
}

const index = async (req, res) => {
    try{
        const query = req.query;
        query.deleted = false;

        let result = await MeetingHistory.aggregate([
            { $match: query },
            {
                $lookup: {
                    from: 'User',
                    localField: 'createBy',
                    foreignField: '_id',
                    as: 'users'
                }
            },
            { $unwind: { path: '$users', preserveNullAndEmptyArrays: true, } },
            {
                $addFields: {
                    createdByName: { $concat: ['$users.firstName', ' ', '$users.lastName'] },
                }
            },
            {
                $project: {
                    users: 0
                }
            }
        ]);

        res.send(result);
    } catch (err) {
        res.status(400).json({ message: "Failed to fetch meetings", err })
    }
}

const view = async (req, res) => {
    try {
        let meetingHistory = await MeetingHistory.findOne({ _id: req.params.id });

        if (!meetingHistory) return res.status(404).json({ message: 'No data found.' })

        let result = await MeetingHistory.aggregate([
            { $match: { _id: meetingHistory._id } },
            {
                $lookup: {
                    from: 'User',
                    localField: 'createBy',
                    foreignField: '_id',
                    as: 'users'
                }
            },
            {
                $lookup: {
                    from: 'Contacts',
                    let: { contactIds: '$attendes' },
                    pipeline: [
                        { $match: { $expr: { $in: ['$_id', '$$contactIds'] } } },
                        { $project: { _id: 1, fullName: 1 } }
                    ],
                    as: 'attendes'
                }
            },
            {
                $lookup: {
                    from: 'Leads',
                    let: { leadIds: '$attendesLead' },
                    pipeline: [
                        { $match: { $expr: { $in: ['$_id', '$$leadIds'] } } },
                        { $project: { _id: 1, leadName: 1 } }
                    ],
                    as: 'attendesLead'
                }
            },
            { $unwind: { path: '$users', preserveNullAndEmptyArrays: true, } },
            {
                $addFields: {
                    createdByName: { $concat: ['$users.firstName', ' ', '$users.lastName'] },
                }
            },
            {
                $project: {
                    users: 0
                }
            }
        ]);

        res.status(200).json(result[0]);
    }
    catch (err) {
        res.status(500).json({ message: "Failed to fetch meetings", err })
    }
}

const deleteData = async (req, res) => {
    try {
        const meetingHistory = await MeetingHistory.findByIdAndUpdate(req.params.id, { deleted: true });
        res.status(200).json({ message: "done", meetingHistory })
    } catch (err) {
        res.status(404).json({ message: "Failed to delete meeting", err })
    }
}

const deleteMany = async (req, res) => {
    try {
        const meetingHistory = await MeetingHistory.updateMany({ _id: { $in: req.body } }, { $set: { deleted: true } });
        res.status(200).json({ message: "done", meetingHistory })
    } catch (err) {
        res.status(404).json({ message: "Failed to delete many meetings", err })
    }
}

module.exports = { add, index, view, deleteData, deleteMany }