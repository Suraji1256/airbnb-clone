const buildHomeFilter = (query) => {

    const filter = {};

    // Location
    if (query.location && query.location.trim() !== "") {
        filter.location = {
            $regex: query.location.trim(),
            $options: "i"
        };
    }

    // House name
    if (query.keyword && query.keyword.trim() !== "") {
        filter.houseName = {
            $regex: query.keyword.trim(),
            $options: "i"
        };
    }

    // Price
    if (query.minPrice || query.maxPrice) {

        filter.price = {};

        if (query.minPrice) {
            filter.price.$gte = Number(query.minPrice);
        }

        if (query.maxPrice) {
            filter.price.$lte = Number(query.maxPrice);
        }
    }

    // Property type
    if (query.propertyType && query.propertyType.trim() !== "") {
        filter.propertyType = query.propertyType;
    }

    // Amenities
    if (query.amenities) {

        const amenities = Array.isArray(query.amenities)
            ? query.amenities
            : [query.amenities];

        filter.amenities = {
            $all: amenities
        };
    }

    // Rating
    if (query.rating) {
        filter.averageRating = {
            $gte: Number(query.rating)
        };
    }

    return filter;
};


const buildHomeSort = (sort) => {

    switch (sort) {

        case "low":
            return { price: 1 };

        case "high":
            return { price: -1 };

        case "rating":
            return { averageRating: -1 };

        case "newest":
        default:
            return { createdAt: -1 };
    }
};


module.exports = {
    buildHomeFilter,
    buildHomeSort
};