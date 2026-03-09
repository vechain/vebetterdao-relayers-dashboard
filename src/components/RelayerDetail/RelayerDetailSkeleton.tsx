"use client"

import { Card, Grid, Skeleton, VStack } from "@chakra-ui/react"

export function RelayerDetailSkeleton() {
  return (
    <VStack gap="6" align="stretch">
      <VStack align="start" gap="3">
        <Skeleton height="8" width="160px" rounded="md" />
        <Skeleton height="10" width="300px" rounded="md" />
        <Skeleton height="5" width="400px" rounded="md" />
      </VStack>
      <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap="4">
        <Card.Root variant="primary">
          <Card.Body>
            <VStack gap="4" align="stretch">
              <Skeleton height="5" width="200px" rounded="md" />
              <Skeleton height="20" rounded="md" />
            </VStack>
          </Card.Body>
        </Card.Root>
        <Card.Root variant="primary">
          <Card.Body>
            <VStack gap="4" align="stretch">
              <Skeleton height="5" width="200px" rounded="md" />
              <Skeleton height="20" rounded="md" />
            </VStack>
          </Card.Body>
        </Card.Root>
      </Grid>
      <Card.Root variant="primary">
        <Card.Body>
          <VStack gap="3" align="stretch">
            <Skeleton height="5" width="180px" rounded="md" />
            <Skeleton height="12" rounded="md" />
            <Skeleton height="12" rounded="md" />
            <Skeleton height="12" rounded="md" />
          </VStack>
        </Card.Body>
      </Card.Root>
    </VStack>
  )
}
