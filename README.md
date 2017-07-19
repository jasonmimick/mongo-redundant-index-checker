mongo-redundant-index-checker
=============================

This repo has a simple tool which can parse the output of the [getMongoData.js](https://github.com/mongodb/support-tools/tree/master/getMongoData) script
to quickly let you know if a MongoDB instance has any redundant indexes.

Redundant indexes are a common occurence out in the wild. This is usually a 
consequence of multiple developers working on a common dataset or possibly
not quite understanding how compound indexes work in MongoDB.

Before showing you how to run this tool, let's define just what a redundant index
is. 

Suppose we have a collection called ``people`` and the documents look like this:

<pre></code>
{ "_id" : 3982716, 
  "dob" : ISODate("1970-12-12"),
  "last_name" : "Jones",
  "first_name" : "Jimmy",
  ...
}
</code></pre>


Now also suppose we commonly query by names and so we defined the following 2 indexes:

``{ "last_name" : 1 }``

``{ "last_name" : 1, "first_name" : 1 }``

In this case, the first index is not needed, since the 2nd index _starts with the same key set_
as the first. Therefore, any query which could use the first index and equally use the second.
In MongoDB queries can effeciently use any set of keys from a compound index
provided that all keys from the beginning are used. So an index like,

``
{ "a" : 1, "b" : 1, "c" : 1, "d" : 1}
``

can be used for queries on:
- "a"
- "a" and/or "b"
- "a", "b", "c"
- or all 4, "a", "b", "c", "d"

(and in each case and/or/nor/range/etc and any combination work fine).

Ok, so how do you run this tool.

First, you need the output of getMongoData.js from your MongoDB instance. Then you can download and 
run the indexChecker.js which will automatically detect the getMongoData.js output in it's 
directory (provided it has getMongoData in it's name).

More generally,

<pre><code>$mongo _connection_info_ getMongoData.js > getMongoData-output-someSystem.json
$mongo --quiet --nodb indexChecker.js
</code></pre>

Or here is a handy bash snippet you can edit with your instance connection
information (needs ``curl``):

<pre><code>$mongo --quiet _connection_info --eval "var _printJSON=true;$(curl -s -L https://raw.githubusercontent.com/mongodb/support-tools/master/getMongoData/getMongoData.js)" > getMongoData.output
$mongo --quiet --nodb --eval "$(curl -s -L https://raw.githubusercontent.com/..../indexChecker.js)"
</code></pre>

